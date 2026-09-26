from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.schemas import MediaOut, SearchRequest, SearchResult
from app.services.search_service import semantic_search

router = APIRouter(prefix="/search", tags=["Search"], dependencies=[Depends(verify_api_key)])


@router.post("", response_model=list[SearchResult])
async def search_media(payload: SearchRequest, db: AsyncSession = Depends(get_db)):
    """
    Natural-language search over media evidence, e.g.
    "photos of plastic waste near the river before cleanup".
    """
    results = await semantic_search(db, payload.query, payload.project_id, payload.limit)
    return [SearchResult(media=MediaOut.model_validate(media), score=round(score, 4)) for media, score in results]
