# StrydeX — MVP Skeleton

A thin, end-to-end slice of the StrydeX product plan: athlete signup, profile,
manual performance logging, video upload with computer-vision analysis, an
AI-generated feedback report, coach verification, a public shareable
portfolio page, and scout search. Everything below runs **locally**, no
external accounts needed.

## What's real vs. stubbed

This is a skeleton meant to be extended, not the final product. To keep it
runnable anywhere with zero setup:

| Piece | This skeleton uses | Swap in later |
|---|---|---|
| Database | SQLite (`backend/strydex.db`, auto-created) | Postgres (Supabase/Neon) — just change `DATABASE_URL` |
| Auth | Custom JWT (email + password) | Supabase Auth / Clerk |
| File storage | Local disk (`backend/storage/videos`) | Supabase Storage / Cloudinary |
| Computer vision | OpenCV optical-flow motion analysis (`backend/cv_analysis.py`) | MediaPipe/OpenPose pose landmarks — same function signature |
| AI feedback | Rule-based generator (`backend/ai_feedback.py`) | Real LLM call (Anthropic/OpenAI API) — same input/output shape |

Every one of these swaps is isolated to one file, so the rest of the app
doesn't need to change.

## Project structure

```
strydex/
  backend/            FastAPI + SQLAlchemy + SQLite
    main.py           App entrypoint, CORS, router wiring
    models.py          DB tables
    schemas.py          Pydantic request/response models
    auth.py              JWT + password hashing
    cv_analysis.py        Video → metrics (OpenCV)
    ai_feedback.py         Metrics → feedback text
    routers/
      auth_router.py       signup / login / me
      athlete_router.py    profile create/update, coach verification
      performance_router.py manual training log entries
      video_router.py      video upload + analysis
      portfolio_router.py  public portfolio (no auth)
      scout_router.py      athlete search
    storage/videos/     uploaded video files land here
  frontend/            Next.js 15 (App Router) + TypeScript + Tailwind v4
    src/app/
      page.tsx            landing page
      signup/ login/       auth pages
      profile/edit/         athlete profile form
      dashboard/            athlete's private dashboard (stats, chart, videos)
      upload/                video upload + analysis result
      u/[username]/          public shareable portfolio
      scout/                  scout search UI
    src/lib/api.ts         typed fetch client for the backend
```

## Running it

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at
`http://localhost:8000/docs`). A `strydex.db` SQLite file is created
automatically on first run.

> Note: `requirements.txt` pins `bcrypt==4.0.1` — newer bcrypt (5.x) breaks
> the currently-installed `passlib` version. If you upgrade passlib later,
> you can drop that pin.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. It talks to the backend via
`NEXT_PUBLIC_API_BASE` in `frontend/.env.local` (defaults to
`http://localhost:8000`).

### 3. Try the flow

1. Sign up as an **athlete** at `/signup` → you'll land on the profile form.
2. Fill in your profile (pick a `username` — this becomes your public URL).
3. On the dashboard, log a training session or two (sprint time, jump, etc.)
   to see the trend chart.
4. Go to `/upload`, pick any short video file, and upload it — you'll get
   real CV-derived metrics (duration, motion score, an "explosiveness"
   proxy) and a generated feedback report.
5. Visit `/u/your-username` — that's the public, shareable portfolio page.
6. Sign up a second account as a **coach**, then call
   `POST /athletes/{athlete_id}/verify` (via `/docs`) to mark the athlete
   verified — the badge shows up on their public page.
7. Go to `/scout` and search — filter by sport, position, region, age, or
   verified-only.

## Next steps toward the fuller product plan

- Swap OpenCV motion analysis for MediaPipe pose landmarks (per-sport models).
- Swap the rule-based feedback generator for a real LLM call.
- Move file storage and auth to Supabase; move DB to Postgres.
- Add a coach dashboard (list of athletes to review/verify, not just a raw
  API call).
- Background job queue (Celery/Redis) so video analysis doesn't block the
  upload request as clips get longer/heavier.
  



#**`backend/cv_analysis.py` now runs actual MediaPipe Pose analysis.
On video upload it computes, from real body landmarks:

- average knee flexion angle (hip-knee-ankle)
- average trunk lean (shoulder-hip line vs. vertical)
- estimated stride cadence (strides/min, from ankle height oscillation)

alongside the original optical-flow motion score (kept as a sport-agnostic
fallback signal for clips where no clear pose is detected). `ai_feedback.py`
now prefers the pose-based read when it's available, and falls back to the
motion-only heuristic otherwise — so the "Focus areas" / "Drills" text in the
AI report card is grounded in real biomechanics for sprint clips, not just
motion intensity.

The upload result screen and the public portfolio page already render
`ai_report.summary` / `.strengths` / `.weaknesses` / `.drills` — since pose
data now flows into those same fields, no frontend UI changes were needed to
see real biomechanics feedback after an upload.

## Setup

Same as the original skeleton — see `backend/` and `frontend/` for their own
setup notes if present, otherwise:

```bash
cd backend
python -m venv venv && source venv/bin/activate 
(& "C:\Users\HP\AppData\Local\Programs\Python\Python310\python.exe" -m venv venv
.\venv\Scripts\Activate.ps1)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Note: installing `mediapipe` + `opencv-python-headless` can take a few
minutes the first time (~300MB combined).

## Still stubbed / next steps

- LLM call for feedback generation — `ai_feedback.py` is rule-based; both the
  pose summary and the motion score are already phrased as LLM-ready prompt
  fragments (see the module docstring for the exact swap-in)
- Everything else flagged as scaffolded-but-not-fully-wired in the original
  upload (e.g. coach verification UI, if not already complete — check
  `routers/athlete_router.py`)

---

## Requirements

**Backend**
- Python 3.10+ (MediaPipe wheels don't yet support every 3.12/3.13 build — 3.10/3.11 is safest)
- pip / venv
- ~300MB disk for `mediapipe` + `opencv-python-headless` on first install
- SQLite (bundled with Python — zero config for local dev)

**Frontend**
- Node.js 18.18+ (Next.js 15 requirement)
- npm

**Versions pinned in the repo**
- Backend: `fastapi 0.115`, `uvicorn 0.30`, `sqlalchemy 2.0`, `pydantic 2.9`, `python-jose`, `passlib[bcrypt]`, `opencv-python-headless 4.10`, `numpy 1.26`, `mediapipe 0.10.14` — full list in `backend/requirements.txt`
- Frontend: `next 15.5`, `react 19.1`, `recharts 3.10`, `tailwindcss 4` — full list in `frontend/package.json`

**Environment variables**
- Backend: `DATABASE_URL` (defaults to local SQLite file), `SECRET_KEY` (JWT signing key — set this in production; a dev default is used otherwise)
- Frontend: `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8000`, set in `frontend/.env.local`)

---

## System architecture

```
┌─────────────────────────────┐        HTTP / JSON            ┌──────────────────────────────┐
│   Next.js frontend (React)  │  ─────────────────────────▶   │   FastAPI backend (Python)    │
│   localhost:3000            │  ◀─────────────────────────   │   localhost:8000              │
│                              │        JWT Bearer token        │                                │
│  - Signup/Login pages        │                                 │  auth.py — password hashing,  │
│  - Dashboard (logs, videos)  │                                 │  JWT issue/verify, role guard  │
│  - Profile editor            │                                 │                                │
│  - Public portfolio (/u/…)   │                                 │  routers/ — one file per       │
│  - Scout search              │                                 │  resource (auth, athlete,      │
│  - Video upload               │                                 │  performance, video, portfolio,│
│                              │                                 │  scout)                        │
└──────────────────────────────┘                                 │                                │
                                                                   │  models.py — SQLAlchemy ORM    │
                                                                   │  schemas.py — Pydantic I/O      │
                                                                   │  database.py — SQLite session   │
                                                                   │                                │
                                                                   │  cv_analysis.py — per-upload    │
                                                                   │  video processing (OpenCV +     │
                                                                   │  MediaPipe Pose)                │
                                                                   │         │                       │
                                                                   │         ▼                       │
                                                                   │  ai_feedback.py — turns metrics │
                                                                   │  into summary/strengths/        │
                                                                   │  weaknesses/drills text          │
                                                                   └───────────────┬────────────────┘
                                                                                   │
                                                                                   ▼
                                                                   ┌──────────────────────────────┐
                                                                   │  strydex.db (SQLite file)     │
                                                                   │  backend/storage/videos/      │
                                                                   │  (uploaded video files)       │
                                                                   └──────────────────────────────┘
```

**Request flow — video upload (the core feature):**
1. Athlete uploads a clip from the frontend `/upload` page → `POST /videos/upload` (multipart form).
2. `video_router.py` saves the file to `backend/storage/videos/`, then calls `cv_analysis.analyze_video()`.
3. `cv_analysis.py` runs a single pass over the video: Farneback optical flow for a sport-agnostic motion score, and MediaPipe Pose for knee angle, trunk lean, and stride cadence when a person is detected.
4. Those metrics are saved to the `videos` table, then passed to `ai_feedback.generate_feedback()`, which produces a rule-based summary/strengths/weaknesses/drills object saved to the `ai_reports` table.
5. The frontend renders the returned `VideoItem` (including `ai_report`) immediately on the upload result screen, and again later on the athlete's public portfolio page (`/u/[username]`) for any video marked `visibility: public`.

**Auth flow:** signup/login return a JWT (`auth_router.py`); the frontend stores it in `localStorage` (`lib/api.ts`) and attaches it as a `Bearer` header on authenticated requests; `auth.py`'s `get_current_user` / `require_role` dependencies gate protected routes (e.g. only `coach` accounts can hit `POST /athletes/{id}/verify`).

**Data model (SQLAlchemy, `backend/models.py`):**
- `User` (email, hashed password, role: athlete/coach/scout) → 1:1 `AthleteProfile`
- `AthleteProfile` (username, sport, position, bio, verified flag) → 1:many `PerformanceLog`, 1:many `Video`
- `PerformanceLog` (manually logged sprint times, jumps, distances, lifts)
- `Video` (uploaded clip + all CV-derived metrics) → 1:1 `AIReport`
- `AIReport` (generated summary/strengths/weaknesses/drills)

---

## File-by-file overview

### Backend (`backend/`)

| File | What it does |
|---|---|
| `main.py` | FastAPI app entrypoint. Creates DB tables on startup, configures CORS for `localhost:3000`, and mounts all six routers. |
| `database.py` | SQLAlchemy engine/session setup. Reads `DATABASE_URL` (SQLite by default); swapping to Postgres later needs no code changes. |
| `models.py` | ORM table definitions: `User`, `AthleteProfile`, `PerformanceLog`, `Video`, `AIReport`, and the `Role` enum. |
| `schemas.py` | Pydantic request/response models for every endpoint (signup/login, profile in/out, performance logs, video + AI report, public portfolio, scout results, coach verification). |
| `auth.py` | Password hashing (bcrypt via passlib), JWT creation/decoding (python-jose), and the `get_current_user` / `require_role` FastAPI dependencies used to protect routes. |
| `cv_analysis.py` | Core computer-vision pipeline. Runs OpenCV optical flow (motion/explosiveness score, works on any clip) and MediaPipe Pose (knee flexion angle, trunk lean, stride cadence — sprint-specific biomechanics) over the uploaded video in one pass. |
| `ai_feedback.py` | Turns the metrics dict from `cv_analysis.py` into human-readable coaching feedback (summary, strengths, weaknesses, drills). Currently rule-based; docstring shows the exact swap-in point for a real LLM call. |
| `requirements.txt` | Pinned Python dependencies. |
| `routers/auth_router.py` | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` — account creation, login, current-user lookup. |
| `routers/athlete_router.py` | `POST /athletes/me` (create/update own profile), `GET /athletes/me`, `POST /athletes/{id}/verify` (coach-only verification). |
| `routers/performance_router.py` | `POST /performance/` (log a training session), `GET /performance/me` (list own logs). |
| `routers/video_router.py` | `POST /videos/upload` (save file, run CV analysis, generate AI feedback, persist both), `GET /videos/me` (list own videos). |
| `routers/portfolio_router.py` | `GET /portfolio/{username}` — public, unauthenticated read of an athlete's profile, logs, and public videos. |
| `routers/scout_router.py` | `GET /scout/search` — public, unauthenticated athlete search filtered by sport/position/region/age/verified status. |
| `storage/videos/` | Uploaded video files land here (git-ignored except `.gitkeep`). |

### Frontend (`frontend/src/`)

| File | What it does |
|---|---|
| `lib/api.ts` | Central API client. Wraps `fetch` against the backend, attaches the JWT bearer token from `localStorage`, and exposes one typed function per backend endpoint. |
| `lib/types.ts` | TypeScript interfaces mirroring the backend Pydantic schemas (`Me`, `AthleteProfile`, `PerformanceLog`, `Video`, `AIReport`, `Portfolio`, `ScoutResult`). |
| `lib/useCurrentUser.ts` | React hook that loads the logged-in user (via `/auth/me`) on mount and exposes `{ me, loading, setMe }` to any component. |
| `app/layout.tsx` | Root layout — loads fonts, renders the shared `Navbar`, and wraps all pages. |
| `app/page.tsx` | Landing page — marketing copy, hero stat card, and "Track / Analyze / Get found" pitch. |
| `app/signup/page.tsx` | Signup form (email, password, role picker) → stores JWT → redirects to profile setup (athletes) or dashboard (coach/scout). |
| `app/login/page.tsx` | Login form → stores JWT → redirects to dashboard. |
| `app/profile/edit/page.tsx` | Form to create/update the athlete's profile (name, sport, position, physical stats, bio). |
| `app/dashboard/page.tsx` | Authenticated home base — shows profile summary, lets the athlete log a training session, and lists their performance history and uploaded videos with charts/stat cards. |
| `app/upload/page.tsx` | Video upload form — submits the file to `/videos/upload` and renders the returned CV metrics + AI report immediately. |
| `app/u/[username]/page.tsx` | Public, no-login-required athlete portfolio page — profile, verified badge, performance stats, and public videos with their AI reports. |
| `app/scout/page.tsx` | Public athlete search UI (filters: sport, position, region, age range, verified-only) hitting `/scout/search`. |
| `components/Navbar.tsx` | Site-wide nav — shows Login/Signup when logged out, Dashboard/Logout when logged in. |
| `components/StatCard.tsx` | Small reusable stat display tile (used on dashboard and public portfolio). |
| `components/ProgressChart.tsx` | Recharts-based chart component for visualizing performance-log trends over time on the dashboard. |
| `app/globals.css` | Tailwind CSS v4 setup and global design tokens (colors, fonts). |
