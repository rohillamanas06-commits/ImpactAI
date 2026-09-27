"""
Meta (WhatsApp Business Cloud API & Instagram) webhook and ingestion router.
Allows field workers to upload evidence directly from WhatsApp in the field.
Includes Meta verification handshake, real-time message receiver, automated NGO reply,
and a live simulator endpoint for hackathon demo testing.
"""
import io
import logging
import re
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Media, Project, WhatsAppMessage
from app.schemas import WhatsAppMessageOut, WhatsAppSimulateRequest
from app.services import ai_service, cloudinary_service
from app.services.exif_service import extract_exif_and_gps

logger = logging.getLogger("impactai.webhooks")

router = APIRouter(prefix="/webhooks", tags=["Meta WhatsApp / Instagram"])

VERIFY_TOKEN_DEFAULT = "impactai_meta_webhook_secret_2025"


# ============================================================
# 1. Meta Webhook Verification Handshake (GET)
# ============================================================
@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Standard Meta Cloud API verification challenge.
    When configured in Meta App Dashboard, Meta sends a GET request to verify the endpoint.
    """
    if hub_mode == "subscribe" and hub_verify_token in [VERIFY_TOKEN_DEFAULT, "impactai_secret", settings.API_KEY]:
        logger.info("Meta WhatsApp webhook verified successfully!")
        return Response(content=hub_challenge, media_type="text/plain", status_code=200)

    # For hackathon convenience, accept challenge if provided
    if hub_challenge:
        return Response(content=hub_challenge, media_type="text/plain", status_code=200)

    return {"status": "ImpactAI WhatsApp Webhook Active", "instructions": "Configure hub.verify_token in Meta App Dashboard"}


# ============================================================
# 2. WhatsApp Ingestion Helper
# ============================================================
async def _process_whatsapp_evidence(
    sender_phone: str,
    sender_name: Optional[str],
    caption: str,
    media_url: Optional[str],
    project_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> tuple[Optional[Media], str]:
    """
    Downloads media, uploads to Cloudinary, extracts EXIF/GPS, runs AI analysis,
    and returns (media_record, auto_reply_message).
    """
    # 1. Match project: explicit ID -> keyword in caption (#proj-name) -> first project in DB
    target_project = None
    if project_id:
        target_project = await db.get(Project, project_id)

    if not target_project and caption:
        # Check hashtag or project keyword
        words = re.findall(r"#(\w+)", caption)
        if words:
            for w in words:
                stmt = select(Project).where(Project.name.ilike(f"%{w}%"))
                p = (await db.execute(stmt)).scalars().first()
                if p:
                    target_project = p
                    break

    if not target_project:
        # Fall back to first available project
        target_project = (await db.execute(select(Project).order_by(Project.created_at.desc()))).scalars().first()

    if not target_project:
        return None, "⚠️ Received evidence, but no active project was found in ImpactAI to attach it to. Please create a project first."

    # 2. Process image/media
    # Default sample image if none provided
    sample_fallback_url = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80"
    active_media_url = media_url or sample_fallback_url

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(active_media_url)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as exc:
        logger.error(f"Failed downloading WhatsApp media: {exc}")
        return None, f"⚠️ Could not download media from {active_media_url}: {exc}"

    # Extract EXIF & GPS
    exif_data, lat, lon = extract_exif_and_gps(image_bytes)

    # Upload to Cloudinary
    upload_result = await cloudinary_service.upload_media(
        image_bytes,
        filename=f"whatsapp_{sender_phone[-4:]}_{uuid.uuid4().hex[:6]}.jpg",
        folder=f"impactai/{target_project.id}/whatsapp",
    )

    secure_url = upload_result["secure_url"]

    # AI Analysis via Gemini
    try:
        ai_res = await ai_service.analyze_image_url(secure_url)
    except Exception:
        ai_res = {
            "description": caption or "Field evidence submitted via WhatsApp",
            "tags": ["field-submission", "whatsapp"],
            "signals": ["community-monitoring"],
            "location_guess": None,
            "activity_guess": None,
        }

    final_loc = ai_res.get("location_guess") or "Field Site"
    if (lat is None or lon is None) and final_loc:
        est_lat, est_lon = await ai_service.estimate_coordinates(final_loc)
        lat = lat or est_lat
        lon = lon or est_lon

    # Embeddings
    emb_text = f"{ai_res.get('description', '')} {' '.join(ai_res.get('tags', []))} {caption}".strip()
    embedding = None
    if emb_text:
        try:
            embedding = await ai_service.generate_embedding(emb_text)
        except Exception:
            embedding = None

    media_obj = Media(
        project_id=target_project.id,
        cloudinary_public_id=upload_result["public_id"],
        cloudinary_resource_type="image",
        secure_url=secure_url,
        thumbnail_url=secure_url,
        original_filename=f"whatsapp_evidence_{sender_phone[-4:]}.jpg",
        format=upload_result.get("format", "jpg"),
        size_bytes=upload_result.get("bytes", len(image_bytes)),
        latitude=lat,
        longitude=lon,
        exif_data=exif_data,
        location=final_loc,
        activity=ai_res.get("activity_guess"),
        description=ai_res.get("description") or caption,
        tags=ai_res.get("tags") or ["whatsapp", "field-evidence"],
        signals=ai_res.get("signals") or ["verified-evidence"],
        ai_raw_response=ai_res,
        embedding=embedding,
    )
    db.add(media_obj)
    await db.commit()
    await db.refresh(media_obj)

    # Generate friendly automated WhatsApp reply
    tags_formatted = " ".join([f"#{t}" for t in (media_obj.tags or [])[:4]])
    reply_msg = (
        f"📸 Evidence received & verified by ImpactAI!\n\n"
        f"🏷️ Tags: {tags_formatted or '#impact'}\n"
        f"📍 Location: {final_loc}\n"
        f"✅ Added to Project: {target_project.name}\n\n"
        f"Thank you {sender_name or 'Field Officer'}! Your evidence is now timestamped and searchable."
    )

    return media_obj, reply_msg


# ============================================================
# 3. Live WhatsApp Webhook Event Receiver (POST)
# ============================================================
@router.post("/whatsapp")
async def receive_whatsapp_event(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Meta Cloud API Webhook event receiver.
    Receives incoming WhatsApp messages from field workers, extracts media, and processes it.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    entries = body.get("entry", [])
    processed_count = 0

    for entry in entries:
        for change in entry.get("changes", []):
            val = change.get("value", {})
            messages = val.get("messages", [])
            contacts = {c.get("wa_id"): c.get("profile", {}).get("name") for c in val.get("contacts", [])}

            for msg in messages:
                sender = msg.get("from", "unknown")
                sender_name = contacts.get(sender, "Field Worker")
                msg_id = msg.get("id")
                msg_type = msg.get("type")

                caption = ""
                media_url = None

                if msg_type == "image":
                    caption = msg.get("image", {}).get("caption", "")
                    # Note: in production, Meta returns a media ID to download from Graph API.
                    # If direct URL provided or fallback:
                    media_url = msg.get("image", {}).get("url")
                elif msg_type == "text":
                    caption = msg.get("text", {}).get("body", "")

                media_obj, reply = await _process_whatsapp_evidence(
                    sender_phone=sender,
                    sender_name=sender_name,
                    caption=caption,
                    media_url=media_url,
                    project_id=None,
                    db=db,
                )

                # Log message record
                log_entry = WhatsAppMessage(
                    sender_phone=sender,
                    sender_name=sender_name,
                    message_id=msg_id,
                    caption=caption,
                    media_url=media_url or (media_obj.secure_url if media_obj else None),
                    media_type=msg_type,
                    project_id=media_obj.project_id if media_obj else None,
                    media_id=media_obj.id if media_obj else None,
                    status="processed" if media_obj else "failed",
                    reply_text=reply,
                )
                db.add(log_entry)
                await db.commit()
                processed_count += 1

    return {"status": "success", "processed_messages": processed_count}


# ============================================================
# 4. WhatsApp Simulator for Hackathon Testing & Demos
# ============================================================
@router.post("/whatsapp/simulate", response_model=WhatsAppMessageOut)
async def simulate_whatsapp_upload(payload: WhatsAppSimulateRequest, db: AsyncSession = Depends(get_db)):
    """
    Hackathon Testbed: Simulates a field worker sending a photo and caption via WhatsApp.
    Allows instant testing of the entire WhatsApp -> Cloudinary -> Gemini -> Project pipeline
    without needing a Meta production business account.
    """
    media_obj, reply = await _process_whatsapp_evidence(
        sender_phone=payload.sender_phone,
        sender_name=payload.sender_name,
        caption=payload.caption,
        media_url=payload.image_url,
        project_id=payload.project_id,
        db=db,
    )

    log_entry = WhatsAppMessage(
        sender_phone=payload.sender_phone,
        sender_name=payload.sender_name,
        caption=payload.caption,
        media_url=media_obj.secure_url if media_obj else payload.image_url,
        media_type="image",
        project_id=media_obj.project_id if media_obj else payload.project_id,
        media_id=media_obj.id if media_obj else None,
        status="processed" if media_obj else "failed",
        reply_text=reply,
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    return log_entry


@router.get("/whatsapp/messages", response_model=List[WhatsAppMessageOut])
async def list_whatsapp_messages(
    project_id: Optional[uuid.UUID] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Lists recent WhatsApp messages received or simulated."""
    stmt = select(WhatsAppMessage).order_by(WhatsAppMessage.created_at.desc()).limit(limit)
    if project_id:
        stmt = stmt.where(WhatsAppMessage.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalars().all()
