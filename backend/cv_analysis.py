"""
Computer vision analysis for uploaded training/match videos.

This pipeline blends the original MVP motion-analysis fallback with a richer
MediaPipe Pose pass and time-series output used by the analytics dashboard.

1. Optical-flow motion score (general activity/explosiveness proxy) — works on
   any clip regardless of sport or camera angle.
2. MediaPipe Pose biomechanics (sprint-specific) — bilateral knee/hip/ankle/
   shoulder/elbow angles and trunk lean, extracted from actual body landmarks.
3. A per-frame skeleton + joint-angle time series (`frame_series`), plus coarse
   movement-phase segmentation (`phases`) and 0-100 AI Movement Score sub-scores.

Both signals feed into `ai_feedback.generate_feedback()`, which prefers the
pose-based summary when available and falls back to the motion-only read.
"""

import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose
L = mp_pose.PoseLandmark

SKELETON_LANDMARKS = {
    "nose": L.NOSE,
    "left_shoulder": L.LEFT_SHOULDER,
    "right_shoulder": L.RIGHT_SHOULDER,
    "left_elbow": L.LEFT_ELBOW,
    "right_elbow": L.RIGHT_ELBOW,
    "left_wrist": L.LEFT_WRIST,
    "right_wrist": L.RIGHT_WRIST,
    "left_hip": L.LEFT_HIP,
    "right_hip": L.RIGHT_HIP,
    "left_knee": L.LEFT_KNEE,
    "right_knee": L.RIGHT_KNEE,
    "left_ankle": L.LEFT_ANKLE,
    "right_ankle": L.RIGHT_ANKLE,
    "left_foot_index": L.LEFT_FOOT_INDEX,
    "right_foot_index": L.RIGHT_FOOT_INDEX,
}

OPTIMAL_RANGES = {
    "knee": (135.0, 150.0),
    "hip": (115.0, 130.0),
    "ankle": (75.0, 90.0),
}


def _angle_between(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle at point b, formed by rays b->a and b->c, in degrees."""
    ba = a - b
    bc = c - b
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc)) + 1e-9
    cos_angle = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


def _xy(pts: dict, name: str) -> np.ndarray:
    return np.array(pts[name])


def _side_angles(pts: dict, side: str) -> dict:
    """Knee/hip/ankle/elbow/shoulder angles for one side ('left'/'right')."""

    def has(*names):
        return all(f"{side}_{n}" in pts for n in names)

    out = {}
    if has("hip", "knee", "ankle"):
        out[f"{side}_knee"] = _angle_between(
            _xy(pts, f"{side}_hip"), _xy(pts, f"{side}_knee"), _xy(pts, f"{side}_ankle")
        )
    if has("shoulder", "hip", "knee"):
        out[f"{side}_hip"] = _angle_between(
            _xy(pts, f"{side}_shoulder"), _xy(pts, f"{side}_hip"), _xy(pts, f"{side}_knee")
        )
    if has("knee", "ankle", "foot_index"):
        out[f"{side}_ankle"] = _angle_between(
            _xy(pts, f"{side}_knee"), _xy(pts, f"{side}_ankle"), _xy(pts, f"{side}_foot_index")
        )
    if has("shoulder", "elbow", "wrist"):
        out[f"{side}_elbow"] = _angle_between(
            _xy(pts, f"{side}_shoulder"), _xy(pts, f"{side}_elbow"), _xy(pts, f"{side}_wrist")
        )
    if has("elbow", "shoulder", "hip"):
        out[f"{side}_shoulder"] = _angle_between(
            _xy(pts, f"{side}_elbow"), _xy(pts, f"{side}_shoulder"), _xy(pts, f"{side}_hip")
        )
    return out


def _trunk_lean(pts: dict) -> float | None:
    if not ("left_shoulder" in pts and "right_shoulder" in pts and "left_hip" in pts and "right_hip" in pts):
        return None
    shoulder_mid = (_xy(pts, "left_shoulder") + _xy(pts, "right_shoulder")) / 2
    hip_mid = (_xy(pts, "left_hip") + _xy(pts, "right_hip")) / 2
    vertical = np.array([0.0, 1.0])
    torso_vec = hip_mid - shoulder_mid
    denom = (np.linalg.norm(torso_vec) * np.linalg.norm(vertical)) + 1e-9
    cos_a = np.clip(np.dot(torso_vec, vertical) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_a)))


def _estimate_cadence(ankle_y_series: list, fps: float) -> float | None:
    """Count local minima (feet lifted = smaller y in image coords) as strides."""
    if len(ankle_y_series) < 5 or fps <= 0:
        return None
    y = np.array(ankle_y_series)
    y_smooth = np.convolve(y, np.ones(3) / 3, mode="same")
    peaks = sum(
        1
        for i in range(1, len(y_smooth) - 1)
        if y_smooth[i] < y_smooth[i - 1] and y_smooth[i] < y_smooth[i + 1]
    )
    duration_s = len(y_smooth) / fps
    if duration_s <= 0:
        return None
    return round((peaks / duration_s) * 60, 1)


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return float(max(lo, min(hi, v)))


def _empty_result() -> dict:
    return {
        "duration_sec": None,
        "fps": None,
        "frame_count": None,
        "motion_score": None,
        "est_max_speed_score": None,
        "avg_knee_angle_deg": None,
        "avg_trunk_lean_deg": None,
        "estimated_cadence_spm": None,
        "pose_summary": None,
        "score_technique": None,
        "score_stability": None,
        "score_symmetry": None,
        "score_efficiency": None,
        "score_overall": None,
        "phases": None,
        "frame_series": None,
    }


def analyze_video(filepath: str) -> dict:
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        return _empty_result()

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_sec = (frame_count / fps) if fps else None

    prev_gray = None
    motion_series = []
    knee_angles = []
    trunk_angles = []
    ankle_y_series = []
    frame_series = []
    sample_every = max(1, frame_count // 90) if frame_count else 1

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if idx % sample_every == 0:
                t = round(idx / fps, 3) if fps else float(idx)

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray_small = cv2.resize(gray, (320, 180))
                if prev_gray is not None:
                    flow = cv2.calcOpticalFlowFarneback(
                        prev_gray, gray_small, None, 0.5, 3, 15, 3, 5, 1.2, 0
                    )
                    mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                    motion_series.append((t, float(np.mean(mag))))
                prev_gray = gray_small

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb)
                if result.pose_landmarks:
                    lm = result.pose_landmarks.landmark
                    pts = {}
                    for name, enum_val in SKELETON_LANDMARKS.items():
                        p = lm[enum_val]
                        if p.visibility >= 0.35:
                            pts[name] = [round(float(p.x), 4), round(float(p.y), 4)]

                    ang = {}
                    ang.update(_side_angles(pts, "left"))
                    ang.update(_side_angles(pts, "right"))
                    trunk = _trunk_lean(pts)
                    if trunk is not None:
                        ang["trunk_lean"] = round(trunk, 1)
                        trunk_angles.append(trunk)

                    for side_key in ("left_knee", "right_knee"):
                        if side_key in ang:
                            knee_angles.append(ang[side_key])

                    if "left_ankle" in pts:
                        ankle_y_series.append(pts["left_ankle"][1])
                    elif "right_ankle" in pts:
                        ankle_y_series.append(pts["right_ankle"][1])

                    if pts:
                        frame_series.append(
                            {"t": t, "lm": pts, "ang": {k: round(v, 1) for k, v in ang.items()}}
                        )

            idx += 1

    cap.release()

    motion_magnitudes = [m for _, m in motion_series]
    motion_score = float(np.mean(motion_magnitudes)) if motion_magnitudes else 0.0
    est_max_speed_score = (
        float(min(100.0, np.max(motion_magnitudes) * 20)) if motion_magnitudes else 0.0
    )

    avg_knee = round(float(np.mean(knee_angles)), 1) if knee_angles else None
    avg_trunk = round(float(np.mean(trunk_angles)), 1) if trunk_angles else None
    effective_fps = fps / sample_every if fps else 0.0
    cadence = _estimate_cadence(ankle_y_series, effective_fps)

    pose_summary = None
    if avg_knee is not None:
        lines = []
        if avg_knee < 150:
            lines.append(f"Average knee flexion is {avg_knee}°, on the tighter side for sprint mechanics.")
        else:
            lines.append(f"Average knee flexion is {avg_knee}°, within a healthy sprint range.")
        if avg_trunk is not None:
            if avg_trunk > 15:
                lines.append(f"Trunk lean averages {avg_trunk}° from vertical, more forward lean than ideal.")
            else:
                lines.append(f"Trunk stays close to upright ({avg_trunk}° lean).")
        if cadence is not None:
            lines.append(f"Estimated stride cadence is ~{cadence} strides/min.")
        pose_summary = " ".join(lines)

    phases = None
    if duration_sec:
        if motion_series:
            peak_t = max(motion_series, key=lambda p: p[1])[0]
            peak_t = min(max(peak_t, duration_sec * 0.3), duration_sec * 0.95)
        else:
            peak_t = duration_sec * 0.65
        accel_t = min(peak_t * 0.5, duration_sec * 0.35)
        phases = [
            {"name": "Start", "t": 0.0},
            {"name": "Acceleration", "t": round(accel_t, 2)},
            {"name": "Peak Speed", "t": round(peak_t, 2)},
            {"name": "Finish", "t": round(duration_sec, 2)},
        ]

    score_technique = score_stability = score_symmetry = score_efficiency = None
    score_overall = None
    if avg_knee is not None:
        knee_lo, knee_hi = OPTIMAL_RANGES["knee"]
        knee_center = (knee_lo + knee_hi) / 2
        knee_dev = abs(avg_knee - knee_center)
        trunk_penalty = max(0.0, (avg_trunk or 0.0) - 10.0)
        score_technique = _clamp(100 - knee_dev * 1.8 - trunk_penalty * 1.5)

        trunk_std = float(np.std(trunk_angles)) if len(trunk_angles) > 1 else 0.0
        score_stability = _clamp(100 - trunk_std * 4.0)

        left_knees = [f["ang"]["left_knee"] for f in frame_series if "left_knee" in f["ang"]]
        right_knees = [f["ang"]["right_knee"] for f in frame_series if "right_knee" in f["ang"]]
        if left_knees and right_knees:
            sym_gap = abs(float(np.mean(left_knees)) - float(np.mean(right_knees)))
            score_symmetry = _clamp(100 - sym_gap * 3.0)
        else:
            score_symmetry = _clamp(70.0)

        motion_cv = (
            float(np.std(motion_magnitudes) / (np.mean(motion_magnitudes) + 1e-6))
            if len(motion_magnitudes) > 1
            else 0.0
        )
        cadence_penalty = abs((cadence or 170.0) - 180.0) * 0.4
        score_efficiency = _clamp(100 - motion_cv * 25.0 - cadence_penalty)

        score_overall = round(
            (score_technique + score_stability + score_symmetry + score_efficiency) / 4, 0
        )
        score_technique = round(score_technique, 0)
        score_stability = round(score_stability, 0)
        score_symmetry = round(score_symmetry, 0)
        score_efficiency = round(score_efficiency, 0)

    return {
        "duration_sec": round(duration_sec, 2) if duration_sec else None,
        "fps": round(fps, 2) if fps else None,
        "frame_count": frame_count or None,
        "motion_score": round(motion_score, 3),
        "est_max_speed_score": round(est_max_speed_score, 1),
        "avg_knee_angle_deg": avg_knee,
        "avg_trunk_lean_deg": avg_trunk,
        "estimated_cadence_spm": cadence,
        "pose_summary": pose_summary,
        "score_technique": score_technique,
        "score_stability": score_stability,
        "score_symmetry": score_symmetry,
        "score_efficiency": score_efficiency,
        "score_overall": score_overall,
        "phases": phases,
        "frame_series": frame_series or None,
    }
