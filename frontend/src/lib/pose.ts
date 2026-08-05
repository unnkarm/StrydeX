import type { FrameSample, JointAngles } from "./types";

// Bone connections drawn between skeleton landmarks.
export const SKELETON_BONES: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_foot_index"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_foot_index"],
  ["nose", "left_shoulder"],
  ["nose", "right_shoulder"],
];

// Reference sprint-mechanics ranges shown on the joint-angle cards.
// Mirrors backend OPTIMAL_RANGES in cv_analysis.py.
export const OPTIMAL_RANGES: Record<string, [number, number]> = {
  knee: [135, 150],
  hip: [115, 130],
  ankle: [75, 90],
};

export const ANGLE_CARDS: { key: string; label: string }[] = [
  { key: "knee", label: "Knee" },
  { key: "hip", label: "Hip" },
  { key: "ankle", label: "Ankle" },
];

export const GRAPH_JOINTS: { key: string; label: string }[] = [
  { key: "knee", label: "Knee angle" },
  { key: "hip", label: "Hip angle" },
  { key: "ankle", label: "Ankle angle" },
  { key: "shoulder", label: "Shoulder angle" },
  { key: "elbow", label: "Elbow angle" },
];

export type Side = "left" | "right";

export function angleKey(joint: string, side: Side): keyof JointAngles {
  return `${side}_${joint}` as keyof JointAngles;
}

/** Nearest sample to a given playback time (series assumed sorted by t). */
export function nearestFrame(series: FrameSample[], t: number): FrameSample | null {
  if (!series || series.length === 0) return null;
  let lo = 0;
  let hi = series.length - 1;
  if (t <= series[0].t) return series[0];
  if (t >= series[hi].t) return series[hi];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const a = series[Math.max(0, lo - 1)];
  const b = series[lo];
  return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
}

export function statusForValue(
  value: number | undefined,
  range: [number, number]
): "good" | "low" | "high" | "unknown" {
  if (value === undefined || value === null) return "unknown";
  if (value < range[0]) return "low";
  if (value > range[1]) return "high";
  return "good";
}
