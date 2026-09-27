import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.models import Media, Project, Report
from app.schemas import ReportGenerateRequest, ReportOut, SocialShareKit
from app.services import ai_service
from app.services.pdf_service import build_pdf_report

router = APIRouter(prefix="/projects/{project_id}/reports", tags=["Reports"], dependencies=[Depends(verify_api_key)])

# Separate router for flat /reports/{report_id} lookup, PDF download, and social share
detail_router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(verify_api_key)])



@router.post("", response_model=ReportOut, status_code=201)
async def generate_report(project_id: uuid.UUID, payload: ReportGenerateRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    stmt = select(Media).where(Media.project_id == project_id)
    if payload.period_start:
        stmt = stmt.where(Media.media_date >= payload.period_start)
    if payload.period_end:
        stmt = stmt.where(Media.media_date <= payload.period_end)

    result = await db.execute(stmt)
    media_items = result.scalars().all()

    if not media_items:
        raise HTTPException(400, "No media found for this project/period to build a report from")

    images = sum(1 for m in media_items if m.cloudinary_resource_type == "image")
    videos = sum(1 for m in media_items if m.cloudinary_resource_type == "video")
    locations = sorted({m.location or m.ai_location_guess for m in media_items if (m.location or m.ai_location_guess)})
    activities = sorted({m.activity or m.ai_activity_guess for m in media_items if (m.activity or m.ai_activity_guess)})
    all_tags = [t for m in media_items for t in (m.tags or [])]
    top_tags = sorted(set(all_tags), key=all_tags.count, reverse=True)[:10]
    dates = [m.media_date for m in media_items if m.media_date]

    stats = {
        "total_media": len(media_items),
        "images": images,
        "videos": videos,
        "locations": locations,
        "activities": activities,
        "top_tags": top_tags,
        "date_range": {"start": min(dates), "end": max(dates)} if dates else None,
    }

    # Evidence traceability: keep the exact media IDs that fed this report.
    if payload.highlight_media_ids:
        highlight_set = set(payload.highlight_media_ids)
        samples = [m.description for m in media_items if m.id in highlight_set and m.description]
        source_ids = [str(i) for i in payload.highlight_media_ids]
    else:
        samples = [m.description for m in media_items[:15] if m.description]
        source_ids = [str(m.id) for m in media_items]

    ai_result = await ai_service.generate_report_narrative(stats, samples)

    report = Report(
        project_id=project_id,
        title=payload.title or f"{project.name} — Impact Report",
        period_start=payload.period_start,
        period_end=payload.period_end,
        stats=stats,
        narrative=ai_result.get("narrative"),
        highlights=ai_result.get("highlights") or [],
        source_media_ids=source_ids,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("", response_model=List[ReportOut])
async def list_reports(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report).where(Report.project_id == project_id).order_by(Report.created_at.desc())
    )
    return result.scalars().all()


@detail_router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@detail_router.get("/{report_id}/pdf")
async def export_report_pdf(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Generates an executive, publication-ready PDF impact report."""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    project = await db.get(Project, report.project_id)
    project_name = project.name if project else "Impact Project"

    # Fetch thumbnail evidence from source media IDs
    thumbnails = []
    if report.source_media_ids:
        # Load up to 4 source media items for visual proof
        for sid in report.source_media_ids[:4]:
            try:
                m = await db.get(Media, uuid.UUID(sid))
                if m:
                    thumbnails.append({
                        "url": m.thumbnail_url or m.secure_url,
                        "caption": m.description or m.original_filename or "Evidence photo",
                        "location": m.location or m.ai_location_guess,
                    })
            except Exception:
                pass

    pdf_bytes = build_pdf_report(
        report_title=report.title,
        project_name=project_name,
        period_start=str(report.period_start) if report.period_start else None,
        period_end=str(report.period_end) if report.period_end else None,
        stats=report.stats or {},
        narrative=report.narrative,
        highlights=report.highlights or [],
        image_thumbnails=thumbnails,
    )

    clean_filename = f"ImpactAI_{report.title.replace(' ', '_')[:30]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'},
    )


@detail_router.get("/{report_id}/social", response_model=SocialShareKit)
async def get_report_social_kit(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Generates ready-to-share social copy for LinkedIn, Twitter/X, and Instagram campaign distribution."""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    project = await db.get(Project, report.project_id)
    title = f"{project.name if project else 'Impact Project'}: {report.title}"

    kit_data = await ai_service.generate_social_share_kit(
        title=title,
        stats=report.stats or {},
        narrative=report.narrative or "",
        highlights=report.highlights or [],
    )

    return SocialShareKit(
        report_id=report.id,
        title=report.title,
        twitter_card_text=kit_data.get("twitter_card_text", ""),
        linkedin_post_text=kit_data.get("linkedin_post_text", ""),
        instagram_caption=kit_data.get("instagram_caption", ""),
        hashtags=kit_data.get("hashtags", []),
        suggested_stat_callouts=kit_data.get("suggested_stat_callouts", []),
        shareable_url=f"/reports/{report.id}",
    )


@detail_router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
    await db.commit()
    return None



@router.delete("/{report_id}", status_code=204)
async def delete_project_report(project_id: uuid.UUID, report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report or report.project_id != project_id:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
    await db.commit()
    return None

