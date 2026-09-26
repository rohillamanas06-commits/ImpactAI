"""
Cloudinary integration — the media layer.

Cloudinary is used as more than storage here:
- `upload_media` stores the original asset and lets Cloudinary auto-detect
  image vs video.
- `build_video_thumbnail_url` uses a Cloudinary *transformation* to derive a
  representative frame from a video, which is what gets sent to the AI vision
  model (full video understanding is out of scope for the hackathon timeline).
- Every transformation used is recorded by the caller (see media router) so
  reports/search results can always be traced back to the original asset +
  the exact derivative that was analyzed.
"""
import asyncio
import uuid
from typing import Optional

import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def upload_media(file_bytes: bytes, filename: str, folder: str) -> dict:
    """Upload raw bytes to Cloudinary. resource_type='auto' lets Cloudinary pick image/video."""

    def _upload():
        return cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="auto",
            public_id=uuid.uuid4().hex,
            use_filename=False,
            unique_filename=True,
            filename_override=filename,
        )

    return await asyncio.to_thread(_upload)


def build_video_thumbnail_url(public_id: str, start_offset: str = "1") -> str:
    """JPG thumbnail derived from a video frame at `start_offset` seconds in."""
    url, _options = cloudinary_url(
        public_id,
        resource_type="video",
        format="jpg",
        start_offset=start_offset,
        width=1000,
        crop="limit",
    )
    return url


def destroy_asset(public_id: str, resource_type: str = "image") -> Optional[dict]:
    """Best-effort delete of the underlying Cloudinary asset. Never raises."""
    try:
        return cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        return None
