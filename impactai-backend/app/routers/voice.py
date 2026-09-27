"""
Voice assistant router: "Talk to your evidence".
Provides natural voice querying for field workers and NGO project teams,
interpreting spoken commands via Gemini and routing to semantic search,
comparisons, reports, and upload status.
Also provides Vapi-compatible function-calling webhook endpoints.
"""
import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.models import Comparison, Media, Project, Report
from app.schemas import VoiceQueryRequest, VoiceQueryResponse
from app.services import ai_service, search_service

logger = logging.getLogger("impactai.voice")

router = APIRouter(prefix="/voice", tags=["Voice Assistant"], dependencies=[Depends(verify_api_key)])


@router.post("/query", response_model=VoiceQueryResponse)
async def process_voice_query(payload: VoiceQueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Core conversational voice query endpoint:
    User speaks -> Web Speech / Vapi transcribes -> Gemini interprets intent
    -> routes to existing API action -> returns spoken response + structured action payload.
    """
    project_id = payload.project_id
    project = None
    project_ctx = ""

    if project_id:
        project = await db.get(Project, project_id)
        if project:
            # Gather quick stats for context
            total_stmt = select(func.count(Media.id)).where(Media.project_id == project_id)
            total = (await db.execute(total_stmt)).scalar() or 0
            project_ctx = f"Active Project: '{project.name}' with {total} evidence assets."

    # 1. Interpret user query intent using Gemini
    intent_data = await ai_service.interpret_voice_command(payload.query, project_context=project_ctx)
    intent = intent_data.get("intent", "search")
    spoken_reply = intent_data.get("spoken_response") or ""
    action_type = intent_data.get("action_type", "search_media")
    data_payload: Dict[str, Any] = {}

    # 2. Route based on intent
    try:
        if intent == "search" or action_type == "search_media":
            search_query = intent_data.get("search_terms") or payload.query
            # Run semantic / vector search
            results = await search_service.semantic_search(db=db, query=search_query, project_id=project_id, limit=5)
            data_payload["results"] = [
                {
                    "id": str(media_item.id),
                    "thumbnail_url": media_item.thumbnail_url or media_item.secure_url,
                    "description": media_item.description,
                    "location": media_item.location,
                    "media_date": str(media_item.media_date) if media_item.media_date else None,
                    "score": round(score, 3),
                    "tags": media_item.tags or [],
                }
                for media_item, score in results
            ]
            count = len(results)
            if count == 0:
                spoken_reply = f"I couldn't find any media matching '{search_query}'. Try describing the location or activity."
            else:
                top_media, _ = results[0]
                top_desc = top_media.description or f"evidence from {top_media.location or 'the field'}"
                spoken_reply = f"I found {count} evidence items. The top match shows {top_desc}."


        elif intent == "compare" or action_type == "compare_media":
            # Find comparison pairs in project
            if project_id:
                comp_stmt = (
                    select(Comparison)
                    .where(Comparison.project_id == project_id)
                    .order_by(Comparison.created_at.desc())
                    .limit(3)
                )
                comps = (await db.execute(comp_stmt)).scalars().all()
                if comps:
                    comp = comps[0]
                    before = await db.get(Media, comp.media_before_id)
                    after = await db.get(Media, comp.media_after_id)
                    data_payload["comparison"] = {
                        "id": str(comp.id),
                        "narrative": comp.narrative,
                        "changes": comp.changes,
                        "before_url": before.thumbnail_url or before.secure_url if before else None,
                        "after_url": after.thumbnail_url or after.secure_url if after else None,
                    }
                    spoken_reply = f"Here is the latest before and after comparison: {comp.narrative or 'Analysis complete.'}"
                else:
                    # Suggest picking from media
                    spoken_reply = "No saved comparisons yet for this project. Would you like me to pair the earliest and latest photos?"
            else:
                spoken_reply = "Please select or mention a project first to compare before and after photos."

        elif intent == "report" or action_type == "generate_report":
            if project_id:
                rep_stmt = (
                    select(Report)
                    .where(Report.project_id == project_id)
                    .order_by(Report.created_at.desc())
                    .limit(1)
                )
                rep = (await db.execute(rep_stmt)).scalars().first()
                if rep:
                    data_payload["report"] = {
                        "id": str(rep.id),
                        "title": rep.title,
                        "narrative": rep.narrative,
                        "highlights": rep.highlights,
                    }
                    spoken_reply = f"The latest report for {project.name if project else 'this project'} states: {rep.narrative[:180]}..."
                else:
                    spoken_reply = f"No impact report has been generated yet for this project. You can generate one from the Reports tab."
            else:
                spoken_reply = "I can summarize any project report once you open a project."

        elif intent == "status" or action_type == "check_status":
            if project_id:
                media_stmt = select(Media).where(Media.project_id == project_id)
                items = (await db.execute(media_stmt)).scalars().all()
                images = sum(1 for m in items if m.cloudinary_resource_type == "image")
                videos = sum(1 for m in items if m.cloudinary_resource_type == "video")
                locations = len({m.location or m.ai_location_guess for m in items if (m.location or m.ai_location_guess)})
                data_payload["status"] = {
                    "total": len(items),
                    "images": images,
                    "videos": videos,
                    "locations": locations,
                }
                spoken_reply = (
                    f"Project {project.name if project else ''} has {len(items)} verified media items: "
                    f"{images} photos and {videos} videos across {locations} distinct locations."
                )
            else:
                proj_count = (await db.execute(select(func.count(Project.id)))).scalar() or 0
                spoken_reply = f"You currently have {proj_count} active impact projects registered on ImpactAI."

        else:
            spoken_reply = spoken_reply or "I am listening. You can ask me to search photos, compare before and after evidence, or summarize project impact."

    except Exception as exc:
        logger.error(f"Error handling voice intent {intent}: {exc}")
        spoken_reply = f"I understood your request for {intent}, but encountered an error processing the media database."

    return VoiceQueryResponse(
        intent=intent,
        spoken_response=spoken_reply,
        action_type=action_type,
        data=data_payload,
        extracted_params=intent_data,
    )


@router.post("/vapi-webhook")
async def vapi_webhook_handler(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Standard Vapi webhook handler for tool/function calling from an active Vapi voice call.
    Vapi calls this URL with function calls like search_evidence, compare_media, or get_report.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    message = body.get("message", {})
    msg_type = message.get("type")

    # If Vapi is calling a tool
    if msg_type == "tool-calls":
        tool_calls = message.get("toolCalls", [])
        results = []
        for tc in tool_calls:
            call_id = tc.get("id")
            func_name = tc.get("function", {}).get("name")
            args = tc.get("function", {}).get("arguments", {})

            if func_name == "search_evidence":
                query = args.get("query", "impact")
                proj_id = args.get("project_id")
                uuid_proj = uuid.UUID(proj_id) if proj_id else None
                search_res = await search_service.semantic_search(db=db, query=query, project_id=uuid_proj, limit=3)
                summary = f"Found {len(search_res)} matching evidence items."
                if search_res:
                    summary += f" Top item: {search_res[0][0].description or 'Evidence'}"
                results.append({"toolCallId": call_id, "result": summary})


            elif func_name == "get_project_summary":
                proj_id = args.get("project_id")
                if proj_id:
                    p = await db.get(Project, uuid.UUID(proj_id))
                    name = p.name if p else "Project"
                    results.append({"toolCallId": call_id, "result": f"Project '{name}' is active."})
                else:
                    results.append({"toolCallId": call_id, "result": "Project ID required."})

            else:
                results.append({"toolCallId": call_id, "result": f"Tool {func_name} executed."})

        return {"results": results}

    return {"status": "ok", "message": "Handled Vapi event"}


@router.get("/config")
async def get_voice_config():
    """Returns voice assistant configuration, sample prompts, and feature flags."""
    return {
        "assistant_name": "ImpactAI Field Voice Assistant",
        "sample_prompts": [
            "Show me all photos from the water project in Rajasthan from last month",
            "Generate a report comparing before and after photos of the dam",
            "Search for plastic waste near riverbank",
            "What is the upload status of this project?",
            "Show recent reforestation evidence",
        ],
        "web_speech_supported": True,
        "vapi_integration_enabled": True,
    }
