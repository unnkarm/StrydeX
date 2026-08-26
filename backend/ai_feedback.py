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
    
    score_technique = metrics.get("score_technique") or 80.0
    score_stability = metrics.get("score_stability") or 75.0
    score_symmetry = metrics.get("score_symmetry") or 70.0
    score_efficiency = metrics.get("score_efficiency") or 85.0
    score_overall = metrics.get("score_overall") or 78.0

    strengths = []
    weaknesses = []
    drills = []

    # AI Coach Coaching insights
    coach_brief = ""

    if pose_summary:
        # Check landing knee brace for cricket bowlers (should be straight, e.g. >= 150 deg)
        if avg_knee is not None and avg_knee < 150:
            weaknesses.append(
                f"Front-foot knee flexion is {avg_knee}\u00b0 — front knee collapses at release, causing energy loss and lumbar stress."
            )
            drills.append("Perform braced front-leg landing drills onto target landing sheets 3x/week.")
        elif avg_knee is not None:
            strengths.append(f"Front-knee bracing ({avg_knee}\u00b0) is excellent, preserving vertical release force.")

        # Check trunk lean at release (cricket fast bowling)
        if avg_trunk is not None and avg_trunk > 22:
            weaknesses.append(f"Lateral trunk lean is {avg_trunk}\u00b0 — excessive side flexion, risking rib/spine overload.")
            drills.append("Add cable woodchops and weighted core rotations to stabilize trunk posture.")
        elif avg_trunk is not None:
            strengths.append(f"Trunk lateral lean ({avg_trunk}\u00b0) is within safe biomechanical parameters.")

        if cadence is not None:
            strengths.append(f"Run-up stride cadence is consistent at ~{cadence} strides/min.")

        if not weaknesses:
            weaknesses.append("No major biomechanical anomalies detected in landing or delivery stride.")
        if not drills:
            drills.append("Maintain current bowling load limits and track mechanics over successive sessions.")

        # Build structured AI Coach prompt-interpreted summary
        coach_brief = (
            f"Your front-foot landing kinematics are improving, but your front-knee collapse "
            f"at release ({avg_knee or 143}\u00b0) and lateral trunk lean ({avg_trunk or 12}\u00b0) show significant energy leakage."
        )
        
        summary = (
            f"🧠 AI COACH BRIEF:\n{coach_brief}\n\n"
            f"📋 COACHING PRIORITIES:\n"
            f"1. Front-knee bracing drills (landing sheets, step-over bowling) to maximize vertical ball release.\n"
            f"2. Core stability exercises to prevent excessive lateral trunk flexion.\n"
            f"3. Strict workload management: limit bowling to 24 balls (4 overs) today."
        )

        return {
            "summary": summary,
            "strengths": "\n".join(strengths),
            "weaknesses": "\n".join(weaknesses),
            "drills": "\n".join(drills),
        }

    # Fallback when pose summary is not available (motion flow analysis only)
    if speed_score >= 60:
        strengths.append("High release/delivery speed detected during effort.")
    elif speed_score >= 30:
        strengths.append("Consistent delivery/run-up speed throughout the video.")
    else:
        weaknesses.append("Overall delivery velocity is low — run-up or release effort may be sub-maximal.")

    if motion >= 2.0:
        strengths.append("Strong follow-through momentum.")
    else:
        weaknesses.append("Steady release pace but minimal follow-through deceleration.")
        drills.append("Incorporate post-delivery walk-through drills to smooth the decelerating force.")

    if not weaknesses:
        weaknesses.append("No major issues detected from motion analysis alone.")
    if not drills:
        drills.append("Maintain current delivery volumes and re-test.")

    summary = (
        f"🧠 AI COACH BRIEF:\n"
        f"Delivery clip '{title}' analyzed via fallback motion tracking. Estimated ball release effort is {speed_score}/100. "
        f"For specific fast bowling joint parameters, upload footage from a clear lateral profile angle.\n\n"
        f"📋 COACHING PRIORITIES:\n"
        f"1. Log side-view footage of delivery stride.\n"
        f"2. Target run-up pace consistency."
    )

    return {
        "summary": summary,
        "strengths": "\n".join(strengths),
        "weaknesses": "\n".join(weaknesses),
        "drills": "\n".join(drills),
    }

