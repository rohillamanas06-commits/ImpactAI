# ImpactAI — Backend

AI-powered media evidence management platform for NGOs / governments / sustainability
projects, built with **Cloudinary as the media layer**. Implements the full pipeline from
the problem statement:

```
Upload → AI Analysis → Organization → Search → Comparison → Report
```

## Stack

| Layer | Choice |
|---|---|
| API | FastAPI (async) |
| DB | PostgreSQL (Neon) + `pgvector` for embeddings |
| Media | Cloudinary (upload, storage, video-frame transformations) |
| AI | Google Gemini via the `google-genai` SDK — vision analysis, text embeddings, and report/comparison narratives, all from one provider to keep the build simple |
| Auth | Optional single static API key via `X-API-Key` header |

## Feature → endpoint map

| Problem statement feature | Endpoint(s) |
|---|---|
| Media Upload + Project Organization | `POST /projects`, `POST /projects/{id}/media` |
| AI Media Analysis / Auto-Tagging | done automatically inside the upload endpoint |
| Semantic AI Search | `POST /search` |
| Before vs After Comparison | `POST /compare` |
| AI Impact Report Generator | `POST /projects/{id}/reports` |
| Evidence Traceability | every `Media`/`Report` row stores the Cloudinary `public_id`, source URL, and any transformation used — exposed via `GET /media/{id}` and in each report's `source_media_ids` |

## Setup

```bash
# 1. Create and activate a virtualenv (Python 3.11+)
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# then fill in: DATABASE_URL (Neon), CLOUDINARY_* , GEMINI_API_KEY

# 4. Run
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the interactive Swagger UI.

Tables and the `pgvector` extension are created automatically on startup — no separate
migration step needed (see "Notes & future work" below).

### Docker

```bash
docker build -t impactai-backend .
docker run --env-file .env -p 8000:8000 impactai-backend
```

## Environment variables

See `.env.example` for the full list with comments. The essentials:

- `DATABASE_URL` — Neon Postgres connection string, **asyncpg** style:
  `postgresql+asyncpg://user:password@ep-xxxx.neon.tech/dbname?ssl=require`
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY` — used for vision analysis, embeddings, and report/comparison text
- `API_KEY` — optional; leave blank to disable auth for local dev

## Core API walkthrough

```bash
# Create a project
curl -X POST localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Delhi River Cleanup 2026", "description": "Riverbank cleanup drive"}'

# Upload media (multipart — can attach several files at once)
curl -X POST localhost:8000/api/v1/projects/{project_id}/media \
  -F "files=@before.jpg" -F "files=@after.jpg" \
  -F "location=Yamuna riverbank" -F "activity=cleanup drive"

# Semantic search
curl -X POST localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "plastic waste near the river before cleanup", "project_id": "{project_id}"}'

# Before/after comparison
curl -X POST localhost:8000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{"media_before_id": "{id1}", "media_after_id": "{id2}"}'

# Generate an impact report
curl -X POST localhost:8000/api/v1/projects/{project_id}/reports \
  -H "Content-Type: application/json" -d '{}'
```

## How media analysis works

1. File is uploaded to Cloudinary (`resource_type=auto`, images or video accepted).
2. For videos, a representative frame is extracted via a Cloudinary transformation
   (`so_1,w_1000,c_limit` — 1 second in) since full-video understanding is out of scope
   for the hackathon timeline. The transformation used is recorded on the `Media` row.
3. That image (or video frame) is sent to Gemini with a structured-JSON prompt asking for
   a description, tags, environmental/impact **signals**, and a location/activity guess.
4. User-supplied `location`/`activity` (if given at upload time) win; otherwise the AI's
   guess is used.
5. Description + tags + signals + location + activity are embedded (`text-embedding-004`,
   768-dim) and stored in the `embedding` column (`pgvector`) for semantic search.

## Notes & future work

- **No auth system / multi-tenancy** — kept out of scope for the hackathon timeline. The
  optional static `API_KEY` header is a placeholder; swap in real JWT/user auth for
  production.
- **No background job queue** — uploads are processed synchronously (concurrently within
  a batch via `asyncio.gather`). For large batches, move `_process_single_file` into a
  Celery/RQ worker.
- **No Alembic migrations** — schema is created directly via `metadata.create_all` on
  startup. Add Alembic once the schema stabilizes.
- **Video analysis** uses a single extracted frame, not the full clip. An easy upgrade:
  sample 3-5 frames across the video duration and aggregate tags.
- **PDF export** for reports isn't implemented — `POST /projects/{id}/reports` returns
  structured JSON (narrative + stats + highlights) that a frontend can render into a
  PDF/campaign-ready page.
