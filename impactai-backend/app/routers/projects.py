import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.models import Media, Project
from app.schemas import ProjectCreate, ProjectDetail, ProjectOut, ProjectStats, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["Projects"], dependencies=[Depends(verify_api_key)])


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=List[ProjectOut])
async def list_projects(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    media_result = await db.execute(select(Media).where(Media.project_id == project_id))
    media_items = media_result.scalars().all()

    images = sum(1 for m in media_items if m.cloudinary_resource_type == "image")
    videos = sum(1 for m in media_items if m.cloudinary_resource_type == "video")
    locations = sorted({m.location or m.ai_location_guess for m in media_items if (m.location or m.ai_location_guess)})
    activities = sorted({m.activity or m.ai_activity_guess for m in media_items if (m.activity or m.ai_activity_guess)})
    dates = [m.media_date for m in media_items if m.media_date]
    date_range = {"start": min(dates), "end": max(dates)} if dates else None

    stats = ProjectStats(
        total_media=len(media_items),
        images=images,
        videos=videos,
        locations=locations,
        activities=activities,
        date_range=date_range,
    )

    return ProjectDetail(**ProjectOut.model_validate(project).model_dump(), stats=stats)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: uuid.UUID, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    await db.delete(project)
    await db.commit()
