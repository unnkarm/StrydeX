
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

uvicorn main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Note: installing `mediapipe` + `opencv-python-headless` can take a few
minutes the first time (~300MB combined).

