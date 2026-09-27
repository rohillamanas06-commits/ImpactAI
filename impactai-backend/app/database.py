"""
Async SQLAlchemy engine/session setup, plus a startup routine that enables
the pgvector extension (required for semantic search) and creates tables.

No Alembic for this MVP — schema is created directly via metadata.create_all.
Swap in Alembic migrations later if this goes past hackathon scope.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    # Import models here so they're registered on Base.metadata before create_all runs.
    from app import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE media ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;"))
        await conn.execute(text("ALTER TABLE media ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;"))
        await conn.execute(text("ALTER TABLE media ADD COLUMN IF NOT EXISTS exif_data JSONB DEFAULT '{}';"))
