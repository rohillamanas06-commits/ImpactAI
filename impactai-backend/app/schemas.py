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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = []
    signals: Optional[List[str]] = []
    created_at: datetime


class MediaDetail(MediaOut):
    transformations: Optional[dict] = None
    ai_raw_response: Optional[dict] = None
    exif_data: Optional[dict] = None


class MediaGeoUpdate(BaseModel):
    latitude: float
    longitude: float
    location: Optional[str] = None


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


# ================= Voice Assistant =================
class VoiceQueryRequest(BaseModel):
    query: str
    project_id: Optional[uuid.UUID] = None


class VoiceQueryResponse(BaseModel):
    intent: str  # search | compare | report | status | general_qa
    spoken_response: str
    action_type: str
    data: Optional[dict] = None
    extracted_params: Optional[dict] = None


# ================= WhatsApp / Meta =================
class WhatsAppSimulateRequest(BaseModel):
    sender_phone: str = Field(default="+1234567890")
    sender_name: Optional[str] = "Field Officer"
    caption: str = Field(default="#water-project Installed new solar water pump in village sector 3")
    image_url: Optional[str] = None
    project_id: Optional[uuid.UUID] = None


class WhatsAppMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sender_phone: str
    sender_name: Optional[str] = None
    message_id: Optional[str] = None
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = "image"
    project_id: Optional[uuid.UUID] = None
    media_id: Optional[uuid.UUID] = None
    status: str
    reply_text: Optional[str] = None
    created_at: datetime


# ================= Timeline & Pairs =================
class BeforeAfterPair(BaseModel):
    before_media: MediaOut
    after_media: MediaOut
    location: Optional[str] = None
    similarity_reason: str
    time_gap_days: int


class TimelineBucket(BaseModel):
    period: str  # YYYY-MM
    count: int
    media_items: List[MediaOut]


class TimelineResponse(BaseModel):
    project_id: uuid.UUID
    total_items: int
    date_min: Optional[date] = None
    date_max: Optional[date] = None
    buckets: List[TimelineBucket]
    auto_detected_pairs: List[BeforeAfterPair]


# ================= Social Share =================
class SocialShareKit(BaseModel):
    report_id: uuid.UUID
    title: str
    twitter_card_text: str
    linkedin_post_text: str
    instagram_caption: str
    hashtags: List[str]
    suggested_stat_callouts: List[str]
    shareable_url: str

