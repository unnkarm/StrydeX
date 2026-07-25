"""
Computer vision analysis for uploaded training/match videos.

Two signals, computed in a single pass over the video:

1. Optical-flow motion score (general activity/explosiveness proxy) — works
   on any clip regardless of sport or camera angle, kept from the original
   MVP skeleton as a fallback signal.

2. MediaPipe Pose biomechanics (sprint-specific) — knee flexion angle,
   trunk lean, and estimated stride cadence, extracted from actual body
   landmarks. This is the "real" pipeline promised in the original
   docstring's swap-in note; it targets sprinting as the first sport per
   the MVP plan. Populated only when a person is clearly detected in frame;
   `pose_summary` is None otherwise and the motion score still applies.

Both signals feed into `ai_feedback.generate_feedback()`, which prefers the
pose-based summary when available and falls back to the motion-only read.
"""
import cv2
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose


def _angle_between(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle at point b, formed by rays b->a and b->c, in degrees."""
    ba = a - b
    bc = c - b
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc)) + 1e-9
    cos_angle = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


def _landmark_xy(landmarks, idx) -> np.ndarray:
    lm = landmarks[idx]
    return np.array([lm.x, lm.y])


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
    return round((peaks / duration_s) * 60, 1)  # strides per minute


def analyze_video(filepath: str) -> dict:
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        return {
            "duration_sec": None, "fps": None, "frame_count": None,
            "motion_score": None, "est_max_speed_score": None,
            "avg_knee_angle_deg": None, "avg_trunk_lean_deg": None,
            "estimated_cadence_spm": None, "pose_summary": None,
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_sec = (frame_count / fps) if fps else None

    prev_gray = None
    motion_magnitudes = []
    knee_angles = []
    trunk_angles = []
    ankle_y_series = []

    sample_every = max(1, frame_count // 60) if frame_count else 1

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
                # --- optical flow (motion score) ---
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray_small = cv2.resize(gray, (320, 180))
                if prev_gray is not None:
                    flow = cv2.calcOpticalFlowFarneback(
                        prev_gray, gray_small, None, 0.5, 3, 15, 3, 5, 1.2, 0
                    )
                    mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                    motion_magnitudes.append(float(np.mean(mag)))
                prev_gray = gray_small

                # --- MediaPipe pose (sprint biomechanics) ---
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb)
                if result.pose_landmarks:
                    lm = result.pose_landmarks.landmark
                    L = mp_pose.PoseLandmark
                    use_left = lm[L.LEFT_KNEE].visibility >= lm[L.RIGHT_KNEE].visibility
                    hip_i, knee_i, ankle_i, shoulder_i = (
                        (L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE, L.LEFT_SHOULDER)
                        if use_left
                        else (L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE, L.RIGHT_SHOULDER)
                    )
                    hip = _landmark_xy(lm, hip_i)
                    knee = _landmark_xy(lm, knee_i)
                    ankle = _landmark_xy(lm, ankle_i)
                    shoulder = _landmark_xy(lm, shoulder_i)

                    knee_angles.append(_angle_between(hip, knee, ankle))

                    vertical = np.array([0.0, 1.0])
                    torso_vec = hip - shoulder
                    denom = (np.linalg.norm(torso_vec) * np.linalg.norm(vertical)) + 1e-9
                    cos_a = np.clip(np.dot(torso_vec, vertical) / denom, -1.0, 1.0)
                    trunk_angles.append(float(np.degrees(np.arccos(cos_a))))

                    ankle_y_series.append(float(ankle[1]))

            idx += 1
    cap.release()

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
            lines.append(f"Average knee flexion is {avg_knee}\u00b0, on the tighter side for sprint mechanics.")
        else:
            lines.append(f"Average knee flexion is {avg_knee}\u00b0, within a healthy sprint range.")
        if avg_trunk is not None:
            if avg_trunk > 15:
                lines.append(f"Trunk lean averages {avg_trunk}\u00b0 from vertical, more forward lean than ideal.")
            else:
                lines.append(f"Trunk stays close to upright ({avg_trunk}\u00b0 lean).")
        if cadence is not None:
            lines.append(f"Estimated stride cadence is ~{cadence} strides/min.")
        pose_summary = " ".join(lines)

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
    }
