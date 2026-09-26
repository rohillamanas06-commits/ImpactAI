"""
AI layer, built on Google's current Gen AI SDK (`google-genai` — the
`google-generativeai` package it replaces is fully deprecated). One provider
handles vision analysis, text embeddings, and narrative generation, which
keeps the hackathon build simple. All calls use the SDK's native async client
(`client.aio`), with retries for transient/rate-limit errors.

Swap points for GROQ_API_KEY / ANTHROPIC_API_KEY (already in config/.env) are
noted inline if you want to split vision vs. narrative-writing across
providers later.
"""
import json

import httpx
from google import genai
from google.genai import types
from tenacity import RetryError, retry, stop_after_attempt, wait_exponential

from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

_retry = retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))


async def _download_bytes(url: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        resp = await http_client.get(url)
        resp.raise_for_status()
        mime_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
        return resp.content, mime_type


# ============================================================
# 1. Media analysis / auto-tagging
# ============================================================
VISION_PROMPT = """You are an evidence-analysis assistant for an NGO / sustainability impact
media platform. Look at this field photo and return ONLY a JSON object with this exact shape:
{
  "description": "one or two sentence factual description of what is visible",
  "tags": ["short", "lowercase", "keyword", "tags"],
  "signals": ["environmental or impact-relevant signals, e.g. plastic waste, vegetation, construction, flooding, tree sapling, volunteers"],
  "location_guess": "short guess of the setting/location type, or null if unclear (e.g. 'riverbank', 'urban street')",
  "activity_guess": "short guess of the activity taking place, or null if unclear (e.g. 'cleanup drive', 'tree plantation')"
}
Be concise and factual. Do not invent specific place names you cannot see in the image."""


@_retry
async def _analyze_image_url(image_url: str, is_video_frame: bool = False) -> dict:
    image_bytes, mime_type = await _download_bytes(image_url)
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_VISION_MODEL,
        contents=[
            VISION_PROMPT,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    result = json.loads(response.text)
    if is_video_frame:
        result["note"] = "Analysis derived from a representative video frame, not the full clip."
    return result


async def analyze_image_url(image_url: str, is_video_frame: bool = False) -> dict:
    try:
        return await _analyze_image_url(image_url, is_video_frame)
    except RetryError as exc:
        raise RuntimeError(f"AI service unavailable after retries: {exc.last_attempt.exception()}") from exc


# ============================================================
# 2. Embeddings (semantic search)
# ============================================================
@_retry
async def _generate_embedding(text: str, is_query: bool = False) -> list:
    task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"
    response = await client.aio.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=[text],
        config=types.EmbedContentConfig(task_type=task_type),
    )
    return response.embeddings[0].values


async def generate_embedding(text: str, is_query: bool = False) -> list:
    try:
        return await _generate_embedding(text, is_query)
    except RetryError as exc:
        raise RuntimeError(f"AI service unavailable after retries: {exc.last_attempt.exception()}") from exc


# ============================================================
# 3. Before / after comparison
# ============================================================
COMPARE_PROMPT = """You are comparing two field photos from the same NGO/impact project, taken at
different times.
BEFORE image context: {before_ctx}
AFTER image context: {after_ctx}

Look at both images and return ONLY a JSON object:
{{
  "narrative": "2-4 sentence factual description of what visibly changed between the two images",
  "changes": ["short bullet-style change", "another change"],
  "confidence": "high | medium | low"
}}"""


@_retry
async def _compare_media(before_url: str, after_url: str, before_ctx: str = "", after_ctx: str = "") -> dict:
    (before_bytes, before_mime), (after_bytes, after_mime) = [
        await _download_bytes(before_url),
        await _download_bytes(after_url),
    ]
    prompt = COMPARE_PROMPT.format(before_ctx=before_ctx or "n/a", after_ctx=after_ctx or "n/a")
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_TEXT_MODEL,
        contents=[
            prompt,
            "BEFORE image:",
            types.Part.from_bytes(data=before_bytes, mime_type=before_mime),
            "AFTER image:",
            types.Part.from_bytes(data=after_bytes, mime_type=after_mime),
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return json.loads(response.text)


async def compare_media(before_url: str, after_url: str, before_ctx: str = "", after_ctx: str = "") -> dict:
    try:
        return await _compare_media(before_url, after_url, before_ctx, after_ctx)
    except RetryError as exc:
        raise RuntimeError(f"AI service unavailable after retries: {exc.last_attempt.exception()}") from exc


# ============================================================
# 4. Impact report generation
# ============================================================
REPORT_PROMPT = """You are writing a concise impact report for an NGO/sustainability project, based
on structured evidence collected from field media. Use only the facts given below — do not invent
numbers or place names that aren't present.

PROJECT STATS:
{stats}

SAMPLE EVIDENCE DESCRIPTIONS:
{samples}

Return ONLY a JSON object:
{{
  "narrative": "3-6 sentence impact report body summarizing observed changes and activity",
  "highlights": ["short highlight bullet", "another highlight", "another highlight"]
}}"""


@_retry
async def _generate_report_narrative(stats: dict, samples: list) -> dict:
    stats_text = json.dumps(stats, default=str, indent=2)
    samples_text = "\n".join(f"- {s}" for s in samples) if samples else "None provided."
    prompt = REPORT_PROMPT.format(stats=stats_text, samples=samples_text)
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_TEXT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return json.loads(response.text)


async def generate_report_narrative(stats: dict, samples: list) -> dict:
    try:
        return await _generate_report_narrative(stats, samples)
    except RetryError as exc:
        raise RuntimeError(f"AI service unavailable after retries: {exc.last_attempt.exception()}") from exc
