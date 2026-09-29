# ImpactAI 🌱

> **AI-Powered Impact & Sustainability Media Platform** — built for NGOs, governments, and sustainability organisations that need to turn raw field photos and videos into searchable, verifiable impact evidence.

ImpactAI directly addresses **Problem Statement 02 · Cloudinary**: build an AI-powered media intelligence platform that understands field media, organises evidence by project, location, and timeline, and helps teams generate reliable insights and impact stories.

```
Upload → Cloudinary Storage → Gemini AI Analysis → pgvector Search → Before/After Comparison → PDF/Social Report
```

---

## ✅ Problem Statement Coverage

| PS Goal | Implementation | Status |
|---|---|---|
| Analyse & intelligently organise image/video evidence | Gemini vision auto-tags every upload with description, tags, signals, location & activity guesses; stored per-project | ✅ Done |
| Compare before-and-after media | `compare.py` router + `ProjectComparePage.tsx` — side-by-side picker with Gemini narrative of the change | ✅ Done |
| Searchable via AI metadata, tagging & semantic discovery | `pgvector` embeddings (`text-embedding-004`, 768-dim) power natural-language queries; `search.py` + `ProjectSearchPage.tsx` | ✅ Done |
| Identify projects, activities, locations, visual signals | Gemini vision returns `location_guess`, `activity_guess`, `signals[]`, `tags[]` stored on every `Media` row | ✅ Done |
| Generate visual reports, summaries, campaign-ready content | `reports.py` builds AI narrative + stats → `pdf_service.py` renders a downloadable PDF; social-share kit in frontend | ✅ Done |
| Preserve traceability to source assets & transformations | Every `Media` row stores Cloudinary `public_id`, `secure_url`, `thumbnail_url`, and any transformation applied | ✅ Done |
| Scalable media intelligence product | FastAPI async + Neon serverless Postgres + Cloudinary CDN; Docker-ready backend | ✅ Done |

**Bonus features beyond the core PS:**
- 📱 **WhatsApp ingestion** — field workers upload directly via WhatsApp; backend auto-routes to the right project via hashtag matching (`webhooks.py`)
- 🎙️ **Voice assistant** — "Talk to your evidence": spoken queries are transcribed → Gemini interprets intent → routes to semantic search / comparison / report (`voice.py`)
- 🗺️ **Map view** — GPS/EXIF coordinates extracted from photos and plotted on an interactive map (`ProjectMapPage.tsx`, `exif_service.py`)
- 📅 **Timeline view** — evidence ordered chronologically for each project (`ProjectTimelinePage.tsx`)
- 📤 **Social share kit** — generates platform-ready summaries for Twitter/LinkedIn/WhatsApp (`SocialShareModal.tsx`)

---

## 🗂️ Repository Structure

```
ImpactAI/
├── impactai-backend/               # FastAPI · PostgreSQL (Neon) · Cloudinary · Gemini
│   ├── app/
│   │   ├── main.py                 # App entry point, CORS, router registration
│   │   ├── config.py               # Pydantic settings (env vars)
│   │   ├── database.py             # Async SQLAlchemy engine + session + auto-init
│   │   ├── dependencies.py         # API key auth guard
│   │   ├── models.py               # ORM: Project · Media · Comparison · Report · WhatsAppMessage
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── projects.py         # CRUD for projects
│   │   │   ├── media.py            # Upload, AI tag, list, delete media
│   │   │   ├── compare.py          # Before/after Gemini comparison
│   │   │   ├── search.py           # pgvector semantic search
│   │   │   ├── reports.py          # AI report generation + PDF export
│   │   │   ├── voice.py            # Voice assistant (Gemini intent routing)
│   │   │   └── webhooks.py         # Meta WhatsApp Cloud API ingestion
│   │   └── services/
│   │       ├── ai_service.py       # Gemini vision, embeddings, compare, report, voice
│   │       ├── cloudinary_service.py  # Upload helpers, video-frame extraction
│   │       ├── exif_service.py     # GPS/EXIF extraction from images
│   │       ├── search_service.py   # pgvector cosine similarity search
│   │       └── pdf_service.py      # ReportLab PDF builder
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
└── impactai-frontend/              # React 18 · TypeScript · Vite · Tailwind CSS v4
    ├── src/
    │   ├── App.tsx                 # React Router layout with nested routes
    │   ├── api/                    # Typed API client modules (projects, media, compare, search, reports, voice, webhooks)
    │   ├── components/             # UI primitives + feature components
    │   │   ├── MediaCard.tsx       # Displays AI tags, signals, Cloudinary thumbnail
    │   │   ├── UploadDropzone.tsx  # Drag-and-drop batch uploader
    │   │   ├── ProjectLayout.tsx   # Sidebar nav: Media · Search · Compare · Map · Timeline · Reports
    │   │   ├── Reports/
    │   │   │   └── SocialShareModal.tsx  # Social campaign content generator
    │   │   ├── VoiceAssistant/
    │   │   │   ├── FloatingVoiceButton.tsx
    │   │   │   └── VoiceAssistantModal.tsx   # Web Speech API + Gemini voice query UI
    │   │   └── WhatsApp/
    │   │       └── WhatsAppHubModal.tsx      # WhatsApp simulation + hub UI
    │   └── pages/
    │       ├── ProjectsListPage.tsx       # Dashboard: all projects
    │       ├── ProjectMediaPage.tsx       # Evidence gallery with AI tags
    │       ├── ProjectSearchPage.tsx      # Semantic search UI
    │       ├── ProjectComparePage.tsx     # Before/after comparison
    │       ├── ProjectMapPage.tsx         # GPS map of evidence
    │       ├── ProjectTimelinePage.tsx    # Chronological evidence view
    │       ├── ProjectReportsPage.tsx     # Report list + generation
    │       ├── ReportDetailPage.tsx       # Report viewer + PDF download
    │       └── MediaDetailPage.tsx        # Full media detail with AI analysis
    └── .env.example
```

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **API** | FastAPI (async, Python 3.11+) |
| **Database** | PostgreSQL on [Neon](https://neon.tech) + `pgvector` extension for 768-dim embeddings |
| **Media storage & CDN** | [Cloudinary](https://cloudinary.com) — upload, storage, video-frame extraction, thumbnail transforms |
| **AI — Vision & Text** | Google Gemini `gemini-2.0-flash` (image/video analysis, comparison narrative, report writing, voice intent) |
| **AI — Embeddings** | Google `text-embedding-004` at 768 dimensions for semantic search |
| **PDF export** | ReportLab |
| **WhatsApp ingestion** | Meta WhatsApp Business Cloud API + simulated webhook endpoint |
| **Voice interface** | Web Speech API (browser) + Gemini intent parsing + Vapi-compatible function-call hooks |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4 |
| **Resilience** | `tenacity` retry decorator (exponential back-off) on all AI calls |

---

## ⚡ Quick Start

### Prerequisites

- Python **3.11+** and `pip`
- Node.js **18+** and `npm`
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
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
# Fill in: DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
#          CLOUDINARY_API_SECRET, GEMINI_API_KEY, API_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

> **Auto-migration**: The `pgvector` extension and all tables (`projects`, `media`, `comparisons`, `reports`, `whatsapp_messages`) are created automatically on first startup — no Alembic migration needed.

Interactive API docs → **http://localhost:8000/docs**

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

cp .env.example .env
# Set: VITE_API_BASE_URL=http://localhost:8000
#      VITE_API_KEY=<same API_KEY as backend>

npm run dev
```

App → **http://localhost:5173**

---

### Running the Full Stack

1. Start the backend → confirm `http://localhost:8000/health` returns `{"status":"ok"}`.
2. Start the frontend.
3. Open **http://localhost:5173**, create a project, and upload field evidence.
4. Use the **Search** tab for natural-language queries like *"show me cleanup drives near a river"*.
5. Use **Compare** to select two photos and get a Gemini-generated change narrative.
6. Use **Reports** to generate a one-click AI impact report and download the PDF.

---

## 🔑 Environment Variables

### Backend (`impactai-backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon (or any) PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google AI Studio / Vertex AI key |
| `API_KEY` | Shared secret used by the frontend and webhook auth |
| `GEMINI_VISION_MODEL` | Defaults to `gemini-2.0-flash` |
| `GEMINI_EMBEDDING_MODEL` | Defaults to `text-embedding-004` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Cloud API phone number ID (optional) |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API access token (optional) |

### Frontend (`impactai-frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (e.g. `http://localhost:8000`) |
| `VITE_API_KEY` | Same `API_KEY` as the backend |

---

## 🌐 Key API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/projects` | Create a new project |
| `GET` | `/projects` | List all projects |
| `POST` | `/projects/{id}/media` | Upload media (multipart); triggers Cloudinary upload + Gemini AI analysis |
| `GET` | `/projects/{id}/media` | List evidence for a project |
| `GET` | `/projects/{id}/media/search` | Semantic search via pgvector embeddings |
| `POST` | `/projects/{id}/compare` | Before/after comparison with Gemini narrative |
| `POST` | `/projects/{id}/reports` | Generate AI impact report |
| `GET` | `/reports/{id}/pdf` | Download PDF report |
| `POST` | `/voice/query` | Voice assistant — interpret spoken query, route to search/compare/report |
| `GET/POST` | `/webhooks/whatsapp` | Meta WhatsApp webhook verification & ingestion |
| `POST` | `/webhooks/whatsapp/simulate` | Hackathon simulator for WhatsApp field upload |

Full interactive docs available at `/docs` (Swagger UI) or `/redoc`.

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  Projects · Gallery · Search · Compare · Map · Timeline · Report│
│  Voice Assistant · WhatsApp Hub · Social Share                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                              │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │
│  │ projects │ │  media   │ │compare │ │reports │ │  voice  │  │
│  └──────────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └────┬────┘  │
│                    │           │           │            │        │
│  ┌─────────────────▼───────────▼───────────▼────────────▼────┐  │
│  │                    Services Layer                          │  │
│  │  ai_service · cloudinary_service · exif_service           │  │
│  │  search_service (pgvector) · pdf_service                  │  │
│  └──────┬─────────────────┬────────────────┬─────────────────┘  │
│         │                 │                │                     │
│         ▼                 ▼                ▼                     │
│   ┌──────────┐     ┌────────────┐   ┌──────────────┐           │
│   │Cloudinary│     │Google Gemini│  │ Neon Postgres │           │
│   │(Media CDN│     │Vision +    │  │ + pgvector    │           │
│   │ Storage) │     │Embeddings  │  │  (Evidence DB)│           │
│   └──────────┘     └────────────┘   └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
             ▲
             │ WhatsApp Cloud API
┌────────────┴──────────────────┐
│ Field Workers (WhatsApp)      │
│  → upload photos → hashtag    │
│    routes to correct project  │
└───────────────────────────────┘
```

---

## 📸 Feature Walkthrough

### 1. Smart Upload & AI Auto-tagging
Upload any image or video. The backend:
1. Streams the file to **Cloudinary** (with resource type detection for video)
2. Extracts **GPS/EXIF** metadata if present
3. Calls **Gemini vision** to produce: a factual description, keyword tags, environmental signals (e.g. *"plastic waste"*, *"tree sapling"*, *"flooding"*), location type, and activity type
4. Generates a **768-dim embedding** (`text-embedding-004`) stored in the `pgvector` column

### 2. Semantic Search
Type (or speak) any natural-language query — *"show deforestation near a river"*. The backend embeds the query and runs a **cosine similarity** search over all media in the project, returning ranked results with scores.

### 3. Before / After Comparison
Select any two media items. Gemini receives both images and returns a structured **change narrative** describing what visibly changed — useful for demonstrating environmental recovery or project progress to donors.

### 4. Impact Report Generation
One click generates an AI narrative summarising all evidence in a project (or filtered by date range), including:
- Total images/videos, date range, top locations and activities
- AI-written campaign narrative (Gemini)
- Downloadable **PDF** (ReportLab) with embedded thumbnails and key stats
- **Social share kit** — pre-written captions for Twitter, LinkedIn, WhatsApp

### 5. WhatsApp Field Ingestion
Field workers send photos directly to a WhatsApp number. The backend:
- Verifies the Meta webhook handshake
- Downloads the media from Meta servers
- Routes to the correct project via `#hashtag` matching
- Runs the full AI pipeline automatically
- Sends an auto-reply with the AI analysis summary

### 6. Voice Assistant
A floating microphone button on every page. The browser captures speech, which is:
1. Transcribed via **Web Speech API**
2. Sent to the `/voice/query` endpoint
3. Interpreted by **Gemini** for intent (search / compare / report / upload-status)
4. Routed to the appropriate backend action
5. Returned as a spoken response + structured result payload

---

## 📋 Data Models

| Model | Key Fields |
|---|---|
| `Project` | `id`, `name`, `description`, `created_at` |
| `Media` | `cloudinary_public_id`, `secure_url`, `thumbnail_url`, `resource_type`, `description`, `tags[]`, `signals[]`, `ai_location_guess`, `ai_activity_guess`, `embedding` (768-dim), `gps_lat`, `gps_lon`, `media_date` |
| `Comparison` | `before_media_id`, `after_media_id`, `narrative`, `project_id` |
| `Report` | `title`, `narrative`, `stats` (JSONB), `source_media_ids[]`, `pdf_url`, `project_id` |
| `WhatsAppMessage` | `sender_phone`, `caption`, `media_id`, `project_id`, `ai_summary` |

---

- All Gemini calls use `google-genai` (the modern SDK replacing the deprecated `google-generativeai`) with `client.aio` for full async operation
- Retry logic via **tenacity** (3 attempts, exponential back-off 2–8 s) on all AI + Cloudinary calls
- The `pgvector` extension is enabled automatically; no manual SQL setup required
- **Full Multimodal Video Understanding**: Gemini analyzes full video streams across their duration (supporting inline multimodal parts for <=20MB and the Gemini Files API for large uploads), extracting chronological actions and environmental signals, with Cloudinary transformation thumbnails for fast UI previews
- **JWT User Authentication**: Secure password hashing with bcrypt, JWT Bearer token generation, user profiles, and seamless frontend session management
- **Production Meta WhatsApp Integration**: Direct media retrieval from Meta CDN via Graph API tokens, automatic project dispatch via `#hashtag`, and outbound WhatsApp reply messaging back to field workers
- The backend is environment-driven — swap `GEMINI_VISION_MODEL` / `GEMINI_EMBEDDING_MODEL` to change AI models without code changes

---

## 📄 License

MIT
