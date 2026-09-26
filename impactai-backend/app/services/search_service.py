"""
Semantic search over media, backed by pgvector cosine distance, with fallback to keyword matching.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Media
from app.services.ai_service import generate_embedding


async def semantic_search(
    db: AsyncSession, query: str, project_id: Optional[UUID] = None, limit: int = 20
) -> list[tuple[Media, float]]:
    try:
        query_embedding = await generate_embedding(query, is_query=True)
        stmt = select(Media, Media.embedding.cosine_distance(query_embedding).label("distance")).where(
            Media.embedding.isnot(None)
        )
        if project_id:
            stmt = stmt.where(Media.project_id == project_id)
        stmt = stmt.order_by("distance").limit(limit)

        result = await db.execute(stmt)
        rows = result.all()

        if rows:
            # cosine_distance is in [0, 2]; convert to a friendlier 0-1 "similarity" score.
            return [(media, max(0.0, 1.0 - float(distance))) for media, distance in rows]
    except Exception:
        # Fall back to keyword matching if AI is unreachable
        pass

    # Keyword fallback
    term = f"%{query}%"
    fallback_stmt = select(Media).where(
        or_(
            Media.description.ilike(term),
            Media.original_filename.ilike(term),
            Media.location.ilike(term),
            Media.activity.ilike(term),
        )
    )
    if project_id:
        fallback_stmt = fallback_stmt.where(Media.project_id == project_id)
    fallback_stmt = fallback_stmt.limit(limit)

    fallback_result = await db.execute(fallback_stmt)
    items = fallback_result.scalars().all()
    return [(item, 0.75) for item in items]

