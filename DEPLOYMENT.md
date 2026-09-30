# ImpactAI — Deployment Guide (Render & Vercel)

This guide walks you through deploying **ImpactAI** to production:
- **Backend (FastAPI)** ➡️ [Render](https://render.com)
- **Frontend (React + Vite)** ➡️ [Vercel](https://vercel.com)

---

## Architecture Overview

```
┌───────────────────────────────────────┐
│     Vercel (React + Vite SPA)         │
│     https://your-frontend.vercel.app  │
└──────────────────┬────────────────────┘
                   │ HTTPS API Requests
                   ▼
┌───────────────────────────────────────┐
│     Render (FastAPI Web Service)      │
│     https://impactai-backend.onrender.com
└───────┬──────────────┬──────────────┬─┘
        │              │              │
        ▼              ▼              ▼
  Neon Postgres    Cloudinary     Google Gemini
   (pgvector)    (Media Storage)      (AI)
```

---

## Part 1: Deploy Backend to Render

### Option A: Using Render Blueprint (`render.yaml`) — Recommended

The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/manas/Downloads/projects/impactai-v2/render.yaml) file.

1. Push your code to GitHub / GitLab.
2. Log in to [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** ➡️ **Blueprint**.
4. Connect your `impactai-v2` repository.
5. Render reads `render.yaml` and prepares the `impactai-backend` web service.
6. Fill in the required secret environment variables prompted by Render:
   - `DATABASE_URL`: Your Neon Postgres asyncpg connection string (`postgresql+asyncpg://...`)
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-impactai.vercel.app`)
7. Click **Apply**. Render will install dependencies and start the app.

---

### Option B: Manual Web Service Setup on Render

If you prefer to configure the service manually via the Render dashboard:

1. In Render, click **New +** ➡️ **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `impactai-backend`
   - **Region**: Choose the region closest to your database (e.g., Oregon or Frankfurt).
   - **Root Directory**: `impactai-backend` *(Important!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or Starter)
4. Under **Advanced** ➡️ **Health Check Path**, enter: `/health`
5. Under **Environment Variables**, add the variables from [`impactai-backend/.env.production.example`](file:///c:/Users/manas/Downloads/projects/impactai-v2/impactai-backend/.env.production.example):

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures compatible Python runtime |
| `ENVIRONMENT` | `production` | Production environment tag |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Neon PostgreSQL async connection string |
| `CLOUDINARY_CLOUD_NAME` | `...` | Cloudinary credentials |
| `CLOUDINARY_API_KEY` | `...` | Cloudinary credentials |
| `CLOUDINARY_API_SECRET` | `...` | Cloudinary credentials |
| `GEMINI_API_KEY` | `...` | Google AI Studio API key |
| `GEMINI_VISION_MODEL` | `gemini-3.8-flash` | Vision analysis model |
| `GEMINI_TEXT_MODEL` | `gemini-3.8-flash` | Text/reporting model |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-2` | Embedding model for semantic search |
| `JWT_SECRET_KEY` | *(Random 32+ character string)* | Secret for signing JWT authentication tokens |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Frontend origin(s), comma-separated |
| `CORS_ORIGIN_REGEX` | `^https:\/\/.*\.vercel\.app$` | Automatically permits all Vercel branch & preview URLs |

6. Click **Create Web Service**.
7. Once deployed, test your backend by visiting:
   - `https://<your-render-app>.onrender.com/health` (should return `{"status":"ok","app":"ImpactAI"}`)
   - `https://<your-render-app>.onrender.com/docs` (interactive Swagger UI)

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com/).
2. Click **Add New…** ➡️ **Project**.
3. Import your Git repository (`impactai-v2`).
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: Click **Edit** and select `impactai-frontend` *(Important!)*
   - **Build and Output Settings**: Leave defaults (Build: `npm run build`, Output Directory: `dist`)
5. Under **Environment Variables**, add:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://impactai-backend.onrender.com` | Your Render backend URL (**no trailing slash**) |
| `VITE_API_PREFIX` | `/api/v1` | Matches backend `API_V1_PREFIX` |
| `VITE_API_KEY` | *(leave empty)* | Only needed if static `API_KEY` is configured on backend |

6. Click **Deploy**.
7. Vercel will install dependencies, build the Vite app, and assign you a URL like `https://impactai-frontend.vercel.app`.
8. Routing is already configured via [`impactai-frontend/vercel.json`](file:///c:/Users/manas/Downloads/projects/impactai-v2/impactai-frontend/vercel.json), so refreshing routes like `/projects/...` or `/media/...` works properly without 404 errors.

---

## Part 3: Connect Frontend and Backend

1. Copy your Vercel production URL (e.g., `https://impactai-frontend.vercel.app`).
2. Go to your Render Dashboard ➡️ `impactai-backend` ➡️ **Environment**.
3. Update `CORS_ORIGINS` to include your Vercel production URL:
   ```env
   CORS_ORIGINS=https://impactai-frontend.vercel.app
   ```
4. Save changes. Render will automatically redeploy the service.

---

## Tips & Troubleshooting

- **Render Free Tier Spin-Down**: Free instances on Render spin down after 15 minutes of inactivity. The first request after idle can take ~30–50 seconds to wake up.
- **Database Startup**: The backend runs `init_db()` during startup lifespan to enable `pgvector` and create database tables if they do not exist.
- **CORS Issues**: The backend is configured with `CORS_ORIGIN_REGEX=^https:\/\/.*\.vercel\.app$`, which allows any Vercel preview or production deployment to make API calls to your Render backend.
