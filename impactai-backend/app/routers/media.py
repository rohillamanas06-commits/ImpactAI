"""
Media upload + organization + retrieval.

The upload endpoint IS the pipeline described in the problem statement:
Upload -> Cloudinary -> AI Analysis -> Organization (tags/location/activity)
-> embedding for search, all in one request per file (run concurrently for
batches). Kept synchronous-per-request (no task queue) to stay simple for a
hackathon timeline; see README for how to move this to a background worker.
"""
import asyncio
import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import verify_api_key
from app.models import Media, Project
from app.schemas import BeforeAfterPair, MediaDetail, MediaGeoUpdate, MediaOut, TimelineBucket, TimelineResponse
from app.services import ai_service, cloudinary_service
from app.services.exif_service import extract_exif_and_gps

router = APIRouter(tags=["Media"], dependencies=[Depends(verify_api_key)])


async def _process_single_file(
    file: UploadFile,
    project_id: uuid.UUID,
    location: Optional[str],
    activity: Optional[str],
    media_date: Optional[date],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Media:
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(400, f"{file.filename} exceeds max upload size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    content_type = file.content_type or ""
    allowed = settings.allowed_image_types_list + settings.allowed_video_types_list
    if content_type not in allowed:
        raise HTTPException(400, f"Unsupported file type for {file.filename}: {content_type}")

    # Extract EXIF & GPS from raw bytes if image
    exif_data, exif_lat, exif_lon = ({}, None, None)
    if content_type.startswith("image/"):
        exif_data, exif_lat, exif_lon = extract_exif_and_gps(content)

    upload_result = await cloudinary_service.upload_media(content, file.filename, folder=f"impactai/{project_id}")

    resource_type = upload_result.get("resource_type", "image")
    public_id = upload_result["public_id"]
    secure_url = upload_result["secure_url"]

    transformations: dict = {}
    if resource_type == "video":
        thumb_url = cloudinary_service.build_video_thumbnail_url(public_id)
        transformations["thumbnail_extraction"] = {"start_offset": "1", "width": 1000, "crop": "limit"}
        analysis_target_url = thumb_url
    else:
        thumb_url = secure_url
        analysis_target_url = secure_url


    try:
        ai_result = await ai_service.analyze_image_url(analysis_target_url, is_video_frame=(resource_type == "video"))
    except Exception as exc:  # AI hiccup should never block the upload itself
        ai_result = {
            "description": None,
            "tags": [],
            "signals": [],
            "location_guess": None,
            "activity_guess": None,
            "error": str(exc),
        }

    final_location = location or ai_result.get("location_guess")
    final_activity = activity or ai_result.get("activity_guess")

    # Determine coordinates (explicit form -> EXIF GPS -> AI geocoding fallback)
    final_lat = latitude if latitude is not None else exif_lat
    final_lon = longitude if longitude is not None else exif_lon

    if (final_lat is None or final_lon is None) and final_location:
        est_lat, est_lon = await ai_service.estimate_coordinates(final_location)
        if est_lat is not None and est_lon is not None:
            final_lat = est_lat
            final_lon = est_lon

    embedding_text = " ".join(
        filter(
            None,
            [
                ai_result.get("description"),
                " ".join(ai_result.get("tags") or []),
                " ".join(ai_result.get("signals") or []),
                final_location or "",
                final_activity or "",
            ],
        )
    ).strip()

    embedding = None
    if embedding_text:
        try:
            embedding = await ai_service.generate_embedding(embedding_text)
        except Exception:
            embedding = None

    return Media(
        project_id=project_id,
        cloudinary_public_id=public_id,
        cloudinary_resource_type=resource_type,
        secure_url=secure_url,
        thumbnail_url=thumb_url,
        original_filename=file.filename,
        format=upload_result.get("format"),
        size_bytes=upload_result.get("bytes"),
        width=upload_result.get("width"),
        height=upload_result.get("height"),
        duration=upload_result.get("duration"),
        media_date=media_date,
        location=final_location,
        activity=final_activity,
        latitude=final_lat,
        longitude=final_lon,
        exif_data=exif_data,
        ai_location_guess=ai_result.get("location_guess"),
        ai_activity_guess=ai_result.get("activity_guess"),
        description=ai_result.get("description"),
        tags=ai_result.get("tags") or [],
        signals=ai_result.get("signals") or [],
        ai_raw_response=ai_result,
        transformations=transformations,
        embedding=embedding,
    )


@router.post("/projects/{project_id}/media", response_model=List[MediaOut], status_code=201)
async def upload_media(
    project_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    location: Optional[str] = Form(default=None),
    activity: Optional[str] = Form(default=None),
    media_date: Optional[date] = Form(default=None),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Process the batch concurrently (upload + AI analysis per file).
    media_objects = await asyncio.gather(
        *[_process_single_file(f, project_id, location, activity, media_date, latitude, longitude) for f in files]
    )

    for m in media_objects:
        db.add(m)
    await db.commit()
    for m in media_objects:
        await db.refresh(m)

    return media_objects


@router.get("/projects/{project_id}/media", response_model=List[MediaOut])
async def list_media(
    project_id: uuid.UUID,
    location: Optional[str] = None,
    activity: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Media).where(Media.project_id == project_id)
    if location:
        stmt = stmt.where(Media.location.ilike(f"%{location}%"))
    if activity:
        stmt = stmt.where(Media.activity.ilike(f"%{activity}%"))
    if resource_type:
        stmt = stmt.where(Media.cloudinary_resource_type == resource_type)
    if date_from:
        stmt = stmt.where(Media.media_date >= date_from)
    if date_to:
        stmt = stmt.where(Media.media_date <= date_to)

    stmt = stmt.order_by(Media.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/projects/{project_id}/geo", response_model=List[MediaOut])
async def get_project_geo_media(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns all media items for the project with valid geolocation coordinates for the Map view."""
    stmt = (
        select(Media)
        .where(Media.project_id == project_id)
        .where(Media.latitude.isnot(None))
        .where(Media.longitude.isnot(None))
        .order_by(Media.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/media/{media_id}/geo", response_model=MediaOut)
@router.patch("/projects/{project_id}/media/{media_id}/geo", response_model=MediaOut)
async def update_media_geo(
    media_id: uuid.UUID,
    payload: MediaGeoUpdate,
    project_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    """Allows field workers / users to pin or refine media coordinates on the interactive Map."""
    media = await db.get(Media, media_id)
    if not media:
        raise HTTPException(404, "Media not found")
    media.latitude = payload.latitude
    media.longitude = payload.longitude
    if payload.location:
        media.location = payload.location
    await db.commit()
    await db.refresh(media)
    return media


@router.get("/projects/{project_id}/timeline", response_model=TimelineResponse)
async def get_project_timeline(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Chronological timeline view:
    - Density aggregation over time (monthly buckets)
    - Auto-detected Before & After candidate pairs based on same location/tags and time separation
    """
    stmt = (
        select(Media)
        .where(Media.project_id == project_id)
        .order_by(Media.media_date.asc().nulls_last(), Media.created_at.asc())
    )
    result = await db.execute(stmt)
    media_items = result.scalars().all()

    # Determine date range
    valid_dates = [m.media_date for m in media_items if m.media_date]
    date_min = min(valid_dates) if valid_dates else None
    date_max = max(valid_dates) if valid_dates else None

    # Group into buckets by YYYY-MM
    buckets_dict: dict[str, list] = {}
    for m in media_items:
        key = m.media_date.strftime("%Y-%m") if m.media_date else m.created_at.strftime("%Y-%m")
        if key not in buckets_dict:
            buckets_dict[key] = []
        buckets_dict[key].append(m)

    buckets = [
        TimelineBucket(period=period, count=len(items), media_items=items)
        for period, items in sorted(buckets_dict.items())
    ]

    # Auto-detect Before / After pairs
    # Pair candidates:
    # 1. Matching location with different dates (earlier = before, later = after)
    # 2. Overlapping tags with at least 14 days separation
    auto_pairs: list[BeforeAfterPair] = []
    seen_pair_keys = set()

    for i in range(len(media_items)):
        m1 = media_items[i]
        d1 = m1.media_date or m1.created_at.date()
        for j in range(i + 1, len(media_items)):
            m2 = media_items[j]
            d2 = m2.media_date or m2.created_at.date()
            time_gap = abs((d2 - d1).days)

            # Location match
            loc1 = (m1.location or m1.ai_location_guess or "").strip().lower()
            loc2 = (m2.location or m2.ai_location_guess or "").strip().lower()
            matched_loc = bool(loc1 and loc2 and (loc1 in loc2 or loc2 in loc1))

            # Tag overlap
            tags1 = set(m1.tags or [])
            tags2 = set(m2.tags or [])
            tag_overlap = tags1.intersection(tags2)

            is_candidate = False
            reason = ""

            if matched_loc and time_gap >= 3:
                is_candidate = True
                reason = f"Same location ({m1.location or m2.location}) captured {time_gap} days apart"
            elif len(tag_overlap) >= 2 and time_gap >= 7:
                is_candidate = True
                reason = f"Shared signals ({', '.join(list(tag_overlap)[:2])}) captured {time_gap} days apart"

            if is_candidate:
                pair_key = (str(m1.id), str(m2.id))
                if pair_key not in seen_pair_keys:
                    seen_pair_keys.add(pair_key)
                    # earlier one is before, later is after
                    before_item, after_item = (m1, m2) if d1 <= d2 else (m2, m1)
                    auto_pairs.append(
                        BeforeAfterPair(
                            before_media=before_item,
                            after_media=after_item,
                            location=m1.location or m2.location,
                            similarity_reason=reason,
                            time_gap_days=time_gap,
                        )
                    )
            if len(auto_pairs) >= 8:
                break
        if len(auto_pairs) >= 8:
            break

    return TimelineResponse(
        project_id=project_id,
        total_items=len(media_items),
        date_min=date_min,
        date_max=date_max,
        buckets=buckets,
        auto_detected_pairs=auto_pairs,
    )


@router.get("/media/{media_id}", response_model=MediaDetail)
async def get_media(media_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    media = await db.get(Media, media_id)
    if not media:
        raise HTTPException(404, "Media not found")
    return media


@router.delete("/media/{media_id}", status_code=204)
async def delete_media(
    media_id: uuid.UUID, destroy_on_cloudinary: bool = False, db: AsyncSession = Depends(get_db)
):
    media = await db.get(Media, media_id)
    if not media:
        raise HTTPException(404, "Media not found")
    if destroy_on_cloudinary:
        cloudinary_service.destroy_asset(media.cloudinary_public_id, media.cloudinary_resource_type)
    await db.delete(media)
    await db.commit()

