"""
Pydantic request/response schemas.
"""
import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ================= Project =================
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectStats(BaseModel):
    total_media: int
    images: int
    videos: int
    locations: List[str]
    activities: List[str]
    date_range: Optional[dict] = None


class ProjectDetail(ProjectOut):
    stats: ProjectStats


# ================= Media =================
class MediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    cloudinary_public_id: str
    cloudinary_resource_type: str
    secure_url: str
    thumbnail_url: Optional[str] = None
    original_filename: Optional[str] = None
    format: Optional[str] = None
    size_bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    media_date: Optional[date] = None
    location: Optional[str] = None
    activity: Optional[str] = None
    ai_location_guess: Optional[str] = None
    ai_activity_guess: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    signals: Optional[List[str]] = []
    created_at: datetime


class MediaDetail(MediaOut):
    transformations: Optional[dict] = None
    ai_raw_response: Optional[dict] = None


# ================= Search =================
class SearchRequest(BaseModel):
    query: str
    project_id: Optional[uuid.UUID] = None
    limit: int = Field(default=20, ge=1, le=100)


class SearchResult(BaseModel):
    media: MediaOut
    score: float


# ================= Compare =================
class CompareRequest(BaseModel):
    media_before_id: uuid.UUID
    media_after_id: uuid.UUID


class CompareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    media_before: MediaOut
    media_after: MediaOut
    narrative: Optional[str] = None
    changes: Optional[List[str]] = []
    created_at: datetime


# ================= Reports =================
class ReportGenerateRequest(BaseModel):
    title: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    highlight_media_ids: Optional[List[uuid.UUID]] = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    stats: dict
    narrative: Optional[str] = None
    highlights: Optional[List[str]] = []
    source_media_ids: Optional[List[str]] = []
    created_at: datetime
