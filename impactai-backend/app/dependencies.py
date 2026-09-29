"""
Shared FastAPI dependencies supporting both JWT Bearer tokens and X-API-Key.
"""
from typing import Optional
import uuid

from fastapi import Header, HTTPException, status, Depends
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User

ALGORITHM = "HS256"


async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extracts User if a valid Bearer JWT is passed; otherwise returns None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
        return await db.get(User, user_id)
    except (JWTError, ValueError):
        return None


async def verify_api_key(
    x_api_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified authentication gate:
    1. If a valid JWT Bearer token is provided in the Authorization header, allow access.
    2. If a valid X-API-Key header matches settings.API_KEY, allow access.
    3. If settings.API_KEY is blank and no auth provided, allow access (hackathon/dev mode).
    4. Otherwise, raise 401 Unauthorized.
    """
    # 1. Check JWT token first
    if authorization and authorization.startswith("Bearer "):
        user = await get_current_user_optional(authorization=authorization, db=db)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Check X-API-Key
    if settings.API_KEY:
        if x_api_key == settings.API_KEY:
            return None
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key or Bearer token",
        )

    # 3. Development fallback (no API_KEY configured)
    return None
