"""
ImpactAI — AI-powered media evidence & impact reporting backend.

Run locally:
    uvicorn app.main:app --reload --port 8000

Interactive docs at /docs once running.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import compare, media, projects, reports, search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("impactai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — ensuring pgvector extension + tables exist...")
    await init_db()
    logger.info("Ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI-powered media evidence management platform for NGOs/governments/sustainability "
        "projects, built on Cloudinary. Upload -> AI Analysis -> Organization -> Search -> "
        "Comparison -> Report."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(media.router, prefix=settings.API_V1_PREFIX)
app.include_router(search.router, prefix=settings.API_V1_PREFIX)
app.include_router(compare.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.detail_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/", tags=["Health"])
async def root():
    return {"message": f"{settings.APP_NAME} API — see /docs for the interactive API reference."}
