"""
SQLAlchemy ORM models.

Design notes (mapped to the problem statement's 6 features):
- Project            -> "Media Upload + Project Organization"
- Media               -> stores Cloudinary asset info + AI tags/description/embedding
                         + transformations used (-> "Evidence Traceability")
- Media.embedding     -> pgvector column used by the semantic search endpoint
- Comparison          -> "Before vs After Comparison"
- Report              -> "AI Impact Report Generator", with source_media_ids
                         preserved for traceability back to original evidence
"""
import uuid
from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

EMBEDDING_DIM = 768  # matches Gemini text-embedding-004


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    media_items: Mapped[list["Media"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    comparisons: Mapped[list["Comparison"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Media(Base):
    __tablename__ = "media"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))

    # ---- Cloudinary source of truth (traceability) ----
    cloudinary_public_id: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_resource_type: Mapped[str] = mapped_column(String(20), nullable=False)  # image | video
    secure_url: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[str | None] = mapped_column(String(20), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(nullable=True)
    width: Mapped[int | None] = mapped_column(nullable=True)
    height: Mapped[int | None] = mapped_column(nullable=True)
    duration: Mapped[float | None] = mapped_column(nullable=True)

    # ---- Evidence metadata (user-provided, falls back to AI guesses) ----
    media_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activity: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ai_location_guess: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ai_activity_guess: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ---- AI analysis output ----
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, default=list)
    signals: Mapped[list | None] = mapped_column(JSONB, default=list)  # environmental/impact signals
    ai_raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ---- Traceability: which Cloudinary transformation was analyzed ----
    transformations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ---- Semantic search ----
    embedding: Mapped[list | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="media_items")


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    media_before_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="CASCADE")
    )
    media_after_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media.id", ondelete="CASCADE")
    )

    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    changes: Mapped[list | None] = mapped_column(JSONB, default=list)
    raw_ai_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="comparisons")
    media_before: Mapped["Media"] = relationship(foreign_keys=[media_before_id])
    media_after: Mapped["Media"] = relationship(foreign_keys=[media_after_id])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    stats: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    highlights: Mapped[list | None] = mapped_column(JSONB, default=list)
    source_media_ids: Mapped[list | None] = mapped_column(JSONB, default=list)  # traceability

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="reports")
