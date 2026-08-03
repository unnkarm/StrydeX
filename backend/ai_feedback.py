"""
AI feedback generation.

MVP NOTE: this is a rule-based stub so the skeleton runs fully offline with
no API key required. To upgrade to a real LLM later, replace the body of
`generate_feedback()` with a call to your model of choice (e.g. Anthropic or
OpenAI's API), feeding it the same `metrics` dict and returning the same
(summary, strengths, weaknesses, drills) tuple shape. `metrics["pose_summary"]`
in particular is already phrased as an LLM-ready prompt fragment — pass it
straight into something like:

    f"Sprint mechanics data: {metrics['pose_summary']}. Write a short,
     specific coaching tip for the athlete in under 40 words."
"""


def generate_feedback(metrics: dict, title: str) -> dict:
    motion = metrics.get("motion_score") or 0.0
    speed_score = metrics.get("est_max_speed_score") or 0.0
    pose_summary = metrics.get("pose_summary")
    avg_knee = metrics.get("avg_knee_angle_deg")
    avg_trunk = metrics.get("avg_trunk_lean_deg")
    cadence = metrics.get("estimated_cadence_spm")

    strengths = []
    weaknesses = []
    drills = []

    # Prefer real biomechanics from MediaPipe when a person was clearly
    # detected in frame; fall back to the motion-only read otherwise.
    if pose_summary:
        if avg_knee is not None and avg_knee < 150:
            weaknesses.append(
                f"Knee flexion averages {avg_knee}\u00b0 — leg extension is tighter than ideal during push-off."
            )
            drills.append("Add glute-med activation and lateral band walks 2x/week to improve knee alignment.")
        elif avg_knee is not None:
            strengths.append(f"Knee flexion ({avg_knee}\u00b0) is within a healthy sprint range.")

        if avg_trunk is not None and avg_trunk > 15:
            weaknesses.append(f"Trunk lean averages {avg_trunk}\u00b0 from vertical — more forward lean than ideal.")
            drills.append("Focus on tall posture drills (wall drills, posture runs) to reduce over-rotation.")
        elif avg_trunk is not None:
            strengths.append(f"Trunk stays close to upright ({avg_trunk}\u00b0 lean), good posture control.")

        if cadence is not None:
            strengths.append(f"Estimated cadence is ~{cadence} strides/min.")

        if not weaknesses:
            weaknesses.append("No major mechanical issues detected — upload more angles for deeper feedback.")
        if not drills:
            drills.append("Maintain current technique work and re-upload in 2-3 weeks to track improvement trend.")

        summary = f"Pose analysis of '{title}': {pose_summary}"

        return {
            "summary": summary,
            "strengths": " ".join(strengths),
            "weaknesses": " ".join(weaknesses),
            "drills": " ".join(drills),
        }

    if speed_score >= 60:
        strengths.append("Strong explosive movement detected during peak effort.")
    elif speed_score >= 30:
        strengths.append("Consistent movement intensity throughout the clip.")
    else:
        weaknesses.append("Overall movement intensity is low — footage may be a warm-up or technique drill rather than max-effort.")

    if motion >= 2.0:
        strengths.append("High overall activity level — good work rate.")
    else:
        weaknesses.append("Activity level is fairly steady with few high-intensity bursts.")
        drills.append("Add short max-effort intervals (e.g. 6x20m sprints) to build explosive output.")

    if not weaknesses:
        weaknesses.append("No major issues detected from motion analysis alone — upload more angles for deeper feedback.")
    if not drills:
        drills.append("Maintain current training load and re-upload in 2-3 weeks to track improvement trend.")

    summary = (
        f"Analysis of '{title}': estimated explosiveness score {speed_score}/100, "
        f"average motion intensity {motion}. "
        + (strengths[0] if strengths else "")
    )

    return {
        "summary": summary,
        "strengths": " ".join(strengths),
        "weaknesses": " ".join(weaknesses),
        "drills": " ".join(drills),
    }
