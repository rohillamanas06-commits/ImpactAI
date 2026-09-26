# ImpactAI

> **AI-powered media evidence management platform for NGOs, governments, and sustainability projects.**

ImpactAI turns raw field photos and videos into structured, searchable impact evidence — automatically tagged, semantically searchable, and summarised into shareable reports via Google Gemini.

```
Upload → AI Analysis → Organization → Search → Comparison → Report
```

---

## Repository structure

```
impactai/
├── impactai-backend/     # FastAPI + PostgreSQL (Neon) + Cloudinary + Gemini
└── impactai-frontend/    # React 18 + TypeScript + Vite + Tailwind v4
```

---

## Key features

| Feature | Description |
|---|---|
| 📁 **Project organisation** | Group media evidence into named projects |
| 📤 **Smart upload** | Drag-and-drop batch upload (images & video); files stored on Cloudinary |
| 🤖 **AI auto-tagging** | Gemini vision analyses each file — descriptions, environmental signals, location/activity tags |
| 🔍 **Semantic search** | pgvector embeddings (`text-embedding-004`) power natural-language queries across a project's media |
| 🔄 **Before / after comparison** | Side-by-side visual picker with a Gemini-generated narrative of the change |
| 📊 **Impact report generation** | One-click AI report: narrative + stats + highlights, ready for campaigns |
| 🗂️ **Evidence traceability** | Every media row stores the Cloudinary `public_id`, source URL, and any transformation applied |

---

## Tech stack

| Layer | Technology |
|---|---|
| **API** | FastAPI (async, Python 3.11+) |
| **Database** | PostgreSQL on [Neon](https://neon.tech) + `pgvector` for embeddings |
| **Media storage** | Cloudinary (upload, storage, video-frame extraction) |
| **AI** | Google Gemini — `gemini-2.0-flash` for vision & text, `text-embedding-004` for semantic search |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4 |

---

## Quick start

### Prerequisites

- Python **3.11+** and `pip`
- Node.js **18+** and `npm`
- A [Neon](https://neon.tech) Postgres database (free tier works)
- A [Cloudinary](https://cloudinary.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

---

### 1 · Backend

```bash
cd impactai-backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure secrets
cp .env.example .env
# Edit .env and fill in DATABASE_URL, CLOUDINARY_*, GEMINI_API_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

Interactive API docs → **http://localhost:8000/docs**

> Tables and the `pgvector` extension are created automatically on first startup — no migration step needed.

#### Docker (backend only)

```bash
docker build -t impactai-backend .
docker run --env-file .env -p 8000:8000 impactai-backend
```

---

### 2 · Frontend

```bash
cd impactai-frontend

npm install

# Point the frontend at the running backend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

App → **http://localhost:5173**

---

### Running the full stack together

1. Start the backend (step 1 above) — confirm `http://localhost:8000/health` returns `{"status":"ok"}`.
2. Start the frontend (step 2 above).
3. Open **http://localhost:5173**, create a project, and upload evidence.

> **Note:** Project and media CRUD works without external credentials, but AI analysis and uploads require real `CLOUDINARY_*` and `GEMINI_API_KEY` values in the backend `.env`.

---

## Environment variables

### Backend (`impactai-backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon asyncpg connection string: `postgresql+asyncpg://user:pass@host/db?ssl=require` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `API_KEY` | ❌ | Optional static key for `X-API-Key` header auth |
| `GEMINI_VISION_MODEL` | ❌ | Defaults to `gemini-2.0-flash` |
| `GEMINI_EMBEDDING_MODEL` | ❌ | Defaults to `text-embedding-004` |
| `MAX_UPLOAD_SIZE_MB` | ❌ | Defaults to `50` |

See `impactai-backend/.env.example` for the full annotated list.

### Frontend (`impactai-frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend base URL, e.g. `http://localhost:8000` |

---

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/projects` | Create a project |
| `GET` | `/api/v1/projects` | List all projects |
| `GET` | `/api/v1/projects/{id}` | Get project details + stats |
| `POST` | `/api/v1/projects/{id}/media` | Upload media (multipart, batch) |
| `GET` | `/api/v1/media/{id}` | Get media detail + AI analysis |
| `POST` | `/api/v1/search` | Semantic search across media |
| `POST` | `/api/v1/compare` | Before/after AI comparison |
| `POST` | `/api/v1/projects/{id}/reports` | Generate an impact report |
| `GET` | `/api/v1/projects/{id}/reports/{rid}` | Retrieve a report |
| `GET` | `/health` | Health check |

Full interactive reference at **http://localhost:8000/docs** (Swagger UI).

---

## How AI analysis works

1. File is uploaded to Cloudinary (`resource_type=auto` — images and video accepted).
2. For **video**, a representative frame is extracted via a Cloudinary transformation (`so_1,w_1000,c_limit`). The transformation URL is stored on the `Media` row for traceability.
3. The image (or frame) is sent to **Gemini vision** with a structured-JSON prompt that returns:
   - `description` — what is happening in the scene
   - `tags` — object/activity labels
   - `signals` — environmental/impact indicators (e.g. "plastic waste", "tree cover")
   - `location_guess` / `activity_guess` — AI inference if not supplied at upload
4. User-supplied `location` / `activity` at upload time **take precedence** over AI guesses.
5. All text fields are embedded with `text-embedding-004` (768-dim) and stored in the `embedding` column via `pgvector`, enabling semantic search queries.

---

## Folder structure

```
impactai-backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, router registration
│   ├── config.py            # Pydantic settings
│   ├── database.py          # SQLAlchemy async engine + init_db
│   ├── models.py            # ORM models (Project, Media, Report)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── dependencies.py      # Auth dependency
│   ├── routers/
│   │   ├── projects.py
│   │   ├── media.py
│   │   ├── search.py
│   │   ├── compare.py
│   │   └── reports.py
│   └── services/
│       ├── ai_service.py          # Gemini vision, embeddings, text generation
│       ├── cloudinary_service.py  # Upload, frame extraction
│       └── search_service.py      # pgvector similarity search
└── requirements.txt

impactai-frontend/
├── src/
│   ├── api/          # Typed API client (mirrors backend schemas)
│   ├── components/   # Reusable UI components
│   ├── hooks/        # useAsync, useProjectContext
│   ├── pages/        # One file per route
│   └── index.css     # Tailwind v4 theme tokens
└── vite.config.ts
```

---

## Known limitations / future work

- **No multi-tenancy or JWT auth** — the optional `API_KEY` header is a placeholder. Add real user auth for production.
- **Uploads are synchronous** — large batches block the request. Move processing to a Celery/RQ worker queue.
- **No Alembic migrations** — schema is bootstrapped via `metadata.create_all`. Add Alembic once the schema stabilises.
- **Video = single frame** — only the 1-second frame is analysed. Sampling 3–5 frames would improve coverage.
- **No PDF export** — reports are returned as structured JSON. A frontend print/export flow is a natural next step.

---

## License

MIT
