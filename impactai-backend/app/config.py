"""
Centralized app configuration, loaded from environment variables (.env in dev).
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---------- App ----------
    APP_NAME: str = "ImpactAI"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    API_KEY: str = ""  # blank disables the simple X-API-Key auth

    # ---------- JWT Auth ----------
    JWT_SECRET_KEY: str = "impactai-super-secret-jwt-key-2025-hackathon"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ---------- Database ----------
    DATABASE_URL: str

    # ---------- Cloudinary ----------
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # ---------- Gemini ----------
    GEMINI_API_KEY: str
    GEMINI_VISION_MODEL: str = "gemini-2.0-flash"
    GEMINI_TEXT_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    # ---------- Optional alternate providers ----------
    GROQ_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # ---------- Uploads ----------
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp,image/gif,image/tiff"
    ALLOWED_VIDEO_TYPES: str = "video/mp4,video/quicktime,video/webm,video/x-msvideo,video/mpeg"

    # ---------- WhatsApp / Meta Cloud API ----------
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "impactai_meta_webhook_secret_2025"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",") if t.strip()]

    @property
    def allowed_video_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_VIDEO_TYPES.split(",") if t.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
