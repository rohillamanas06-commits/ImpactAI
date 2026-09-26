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
from app.schemas import MediaDetail, MediaOut
from app.services import ai_service, cloudinary_service

router = APIRouter(tags=["Media"], dependencies=[Depends(verify_api_key)])


async def _process_single_file(
    file: UploadFile,
    project_id: uuid.UUID,
    location: Optional[str],
    activity: Optional[str],
    media_date: Optional[date],
) -> Media:
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(400, f"{file.filename} exceeds max upload size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    content_type = file.content_type or ""
    allowed = settings.allowed_image_types_list + settings.allowed_video_types_list
    if content_type not in allowed:
        raise HTTPException(400, f"Unsupported file type for {file.filename}: {content_type}")

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
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Process the batch concurrently (upload + AI analysis per file).
    media_objects = await asyncio.gather(
        *[_process_single_file(f, project_id, location, activity, media_date) for f in files]
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
