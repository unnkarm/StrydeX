# StrydeX — Merged MVP

This codebase is the uploaded MVP skeleton (flat `backend/` + `frontend/src/app`,
with auth, athlete profiles, performance logs, portfolio, scout search, and
coach verification already scaffolded) with one real upgrade wired in:

**`backend/cv_analysis.py` now runs actual MediaPipe Pose analysis**, not just
optical flow. On video upload it computes, from real body landmarks:

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

## Athlete intelligence

A new `/analytics` page and `backend/analytics.py` module add five features
on top of the raw session log:

- **Long-term trends** — sprint time and vertical jump plotted over the
  athlete's full history, plus plain-language insights (percent improved,
  training consistency, best month).
- **Personal records timeline** — every time a session beats the athlete's
  previous best for sprint time, jump, or weight lifted, it's recorded as a
  timeline entry, not just the current PB.
- **Performance predictions** — a linear regression (`numpy.polyfit`) fit
  over sprint-time history, projecting the metric 30 and 90 days out with an
  R²-based confidence score. Needs at least 4 sessions spread across several
  days; falls back to a plain note otherwise rather than guessing.
- **Injury risk estimation** — a rule-based composite score from training
  load (acute:chronic workload ratio on session minutes), self-reported
  fatigue/soreness/sleep, and pose-derived mechanics flags (knee collapse,
  excessive trunk lean) from the most recent analyzed video.
- **Readiness / fatigue score** — a daily check-in (sleep, stress, soreness,
  energy, resting HR, yesterday's intensity) produces a 0-100 readiness score
  and a training recommendation.

`GET /analytics/summary` returns all of the above condensed into the single
combined view shown at the top of the analytics page. Every one of these
endpoints was exercised end-to-end with a `TestClient` run against a real
SQLite database (10 sessions over 90 days, a checkin, then all 6 endpoints)
before being wired into the frontend.

## Dataset-backed CrossFit scoring

The supplied `athletes.csv.zip` can now train a dedicated CrossFit performance
model with:

```bash
backend/venv/bin/python backend/ml/src/train_crossfit_performance_model.py \
  /path/to/athletes.csv.zip
backend/venv/bin/python backend/ml/src/evaluate.py --json
```

The trainer never loads names, athlete IDs, teams, or affiliates. It rejects
sentinel/out-of-range results, requires at least four objective benchmarks,
fits percentile anchors on training athletes only, and keeps an untouched 20%
holdout. The API routes CrossFit logs to this model and leaves unsupported
sports on the existing generic model.

## Setup

Same as the original skeleton — see `backend/` and `frontend/` for their own
setup notes if present, otherwise:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in the SMTP settings in .env before using password reset.
uvicorn main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Note: installing `mediapipe` + `opencv-python-headless` can take a few
minutes the first time (~300MB combined).

## Password-reset email

The backend sends password-reset links over SMTP. Copy `backend/.env.example`
to `backend/.env` and set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, and (when
required by the provider) `SMTP_USERNAME` and `SMTP_PASSWORD`. Port 587 with
`SMTP_USE_TLS=true` is the usual STARTTLS setup; for implicit TLS on port 465,
set `SMTP_USE_TLS=false` and `SMTP_USE_SSL=true`. Restart the backend after
changing these values.

## Still stubbed / next steps

- LLM call for feedback generation — `ai_feedback.py` is rule-based; both the
  pose summary and the motion score are already phrased as LLM-ready prompt
  fragments (see the module docstring for the exact swap-in)
- The injury-risk and prediction models are intentionally simple MVP
  baselines (rule-based scoring, linear regression) — the plan's mention of
  random forest/XGBoost/LSTM models is a natural upgrade once there's enough
  real athlete-season data to train on
- Everything else flagged as scaffolded-but-not-fully-wired in the original
  upload (e.g. coach verification UI, if not already complete — check
  `routers/athlete_router.py`)
