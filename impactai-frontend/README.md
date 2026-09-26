# ImpactAI — Frontend

React + TypeScript + Vite frontend for the ImpactAI evidence platform. Implements every
feature the backend exposes:

| Feature | Where |
|---|---|
| Project organization | `/` (list + create), `/projects/:id` (overview + stats) |
| Upload + AI auto-tagging | `/projects/:id/media` — drag-and-drop, batch upload, location/activity/date metadata |
| Semantic search | `/projects/:id/search` |
| Before/after comparison | `/projects/:id/compare` — visual pickers + AI narrative |
| Impact report generation | `/projects/:id/reports` + `/projects/:id/reports/:reportId` |
| Evidence traceability | `/media/:id` — Cloudinary source links, transformation used, raw AI response |

## Setup

```bash
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your running backend
npm run dev
```

Open `http://localhost:5173`. The dev server runs on the same port the backend's default
`CORS_ORIGINS` already allows, so no extra config is needed for local dev.

### Running the full stack together

1. Start the backend first (see `../impactai-backend/README.md`) — Postgres running,
   `.env` filled in, `uvicorn app.main:app --reload --port 8000`.
2. In this folder: `npm install && cp .env.example .env && npm run dev`.
3. Open `http://localhost:5173`. Create a project, then upload evidence — this is where
   real `CLOUDINARY_*` and `GEMINI_API_KEY` credentials on the backend start to matter;
   without them, project/media CRUD still works but uploads will fail at the Cloudinary
   call.

### Build for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Design notes

- Tailwind v4 (CSS-based theme in `src/index.css` via `@theme`) — no `tailwind.config.js`.
- No global state library — each page fetches what it needs via the typed `api/` client
  and a small `useAsync` hook (`src/hooks/useAsync.ts`). `ProjectLayout` fetches the
  project once and shares it with child routes via `useOutletContext`, so page fetches
  stay comparison/search/report-specific instead of every page reloading project stats.
- `src/api/types.ts` mirrors `app/schemas.py` on the backend field-for-field — if you add
  a field on one side, add it on the other.
