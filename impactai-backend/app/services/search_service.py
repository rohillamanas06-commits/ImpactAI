"""
Semantic search over media, backed by pgvector cosine distance.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Media
from app.services.ai_service import generate_embedding


async def semantic_search(
    db: AsyncSession, query: str, project_id: Optional[UUID] = None, limit: int = 20
) -> list[tuple[Media, float]]:
    query_embedding = await generate_embedding(query, is_query=True)

    stmt = select(Media, Media.embedding.cosine_distance(query_embedding).label("distance")).where(
        Media.embedding.isnot(None)
    )

    if project_id:
        stmt = stmt.where(Media.project_id == project_id)

    stmt = stmt.order_by("distance").limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    # cosine_distance is in [0, 2]; convert to a friendlier 0-1 "similarity" score.
    return [(media, max(0.0, 1.0 - float(distance))) for media, distance in rows]
