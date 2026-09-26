import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.models import Comparison, Media
from app.schemas import CompareRequest, CompareResponse
from app.services import ai_service

router = APIRouter(tags=["Compare"], dependencies=[Depends(verify_api_key)])


@router.post("/compare", response_model=CompareResponse, status_code=201)
async def compare_media(payload: CompareRequest, db: AsyncSession = Depends(get_db)):
    before = await db.get(Media, payload.media_before_id)
    after = await db.get(Media, payload.media_after_id)
    if not before or not after:
        raise HTTPException(404, "One or both media items were not found")

    before_url = before.thumbnail_url or before.secure_url
    after_url = after.thumbnail_url or after.secure_url

    ai_result = await ai_service.compare_media(
        before_url,
        after_url,
        before_ctx=before.description or "",
        after_ctx=after.description or "",
    )

    comparison = Comparison(
        project_id=before.project_id,
        media_before_id=before.id,
        media_after_id=after.id,
        narrative=ai_result.get("narrative"),
        changes=ai_result.get("changes") or [],
        raw_ai_response=ai_result,
    )
    db.add(comparison)
    await db.commit()
    await db.refresh(comparison)

    return CompareResponse(
        id=comparison.id,
        project_id=comparison.project_id,
        media_before=before,
        media_after=after,
        narrative=comparison.narrative,
        changes=comparison.changes,
        created_at=comparison.created_at,
    )


@router.get("/projects/{project_id}/comparisons", response_model=List[CompareResponse])
async def list_comparisons(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comparison).where(Comparison.project_id == project_id).order_by(Comparison.created_at.desc())
    )
    comparisons = result.scalars().all()

    responses = []
    for c in comparisons:
        before = await db.get(Media, c.media_before_id)
        after = await db.get(Media, c.media_after_id)
        responses.append(
            CompareResponse(
                id=c.id,
                project_id=c.project_id,
                media_before=before,
                media_after=after,
                narrative=c.narrative,
                changes=c.changes,
                created_at=c.created_at,
            )
        )
    return responses
