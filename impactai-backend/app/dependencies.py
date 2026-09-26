"""
Shared FastAPI dependencies.
"""
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_api_key(x_api_key: Optional[str] = Header(default=None)):
    """
    Minimal API-key gate. If API_KEY is left blank in the environment, auth is
    disabled entirely — convenient for local/hackathon development. Set API_KEY
    in .env and require the same value in an "X-API-Key" header to lock it down.
    """
    if not settings.API_KEY:
        return
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
