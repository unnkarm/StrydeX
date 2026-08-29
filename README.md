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

## Athletics performance intelligence

A new `/analytics` page and `backend/analytics.py` module add five features
on top of the raw session log:

- **Event-normalized performance score** — official marks from running,
  hurdles, relays, jumps, throws, walks, and combined events are converted to
  comparable 2025 World Athletics-equivalent points and a 0-100 StrydeX score.
- **Long-term trends** — only real, same-event scored results are used. The API
  no longer manufactures a five-month trajectory when history is missing.
- **Personal records timeline** — every time a session beats the athlete's
  previous best for sprint time, jump, or weight lifted, it's recorded as a
  timeline entry, not just the current PB.
- **Performance predictions** — a same-event trend is shown only after at
  least four scored results across three days and seven days of history.
- **How to improve** — `/athletics/review` returns a measurable next-result
  milestone and event-family priorities, then adds only recommendations
  supported by the athlete's own logged trend, recovery, wind, and focus data.
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

## Rebuilding the athletics scoring model

The shipped model contains 164 category/event regressions covering men and
women across the 2025 tables. It passed an overall fitting MAE of less than
0.1 table points. To reproduce it, place the external 2025 SQLite export as
described in `backend/ml/datasets/external/README.md`, then run:

```bash
python backend/ml/src/build_athletics_scoring_model.py \
  backend/ml/datasets/external/iaaf-2025.sqlite
backend/venv/bin/python backend/ml/src/evaluate.py --json
```

The score uses only the objective result, event, competition category, and
environment. Age, height, weight, region, and other demographic proxies never
increase or decrease it. This is a mark-equivalent score, not an official
World Athletics ranking; placing bonuses and age grading are not included.

### Personalised long-jump and high-jump analysis

Long-jump and high-jump logs may also include optional context measurements:

- approach speed, take-off velocity/angle/contact time, and approach consistency
- board accuracy for long jump or take-off distance for high jump
- vertical jump, reactive-strength index, and a lower-body strength test
- sleep, mental focus, fatigue, soreness, session RPE, and pain status
- profile height/weight plus logged BMI/body-fat values as descriptive context

These fields never change the objective result score. `/athletics/review`
compares them only against the athlete's own same-event history. A metric is
reported as a possible personal driver only after at least five paired results;
the driver-analysis status becomes ready after at least eight same-event
results and two non-trivial associations. All relationships are labelled
observational rather than causal. Body dimensions are not treated as targets,
and pain always produces a recovery/medical-review warning rather than a
performance recommendation.

Useful endpoints:

```text
GET  /athletics/events?competition_category=men&environment=outdoor
POST /athletics/score
GET  /athletics/review
POST /performance/        # stores the auditable score with the result
```

Example score request:

```json
{
  "competition_category": "men",
  "event": "100m",
  "result_value": 11.2,
  "result_unit": "seconds",
  "environment": "outdoor",
  "wind_speed_mps": 1.4
}
```

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
- The athletics score model is production-ready for objective result
  normalization. A genuine future-performance model still needs longitudinal
  athlete-season data; until that exists, StrydeX withholds low-data forecasts
  instead of training on synthetic labels.
- Everything else flagged as scaffolded-but-not-fully-wired in the original
  upload (e.g. coach verification UI, if not already complete — check
  `routers/athlete_router.py`)
