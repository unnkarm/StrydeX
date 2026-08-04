export interface Me {
  id: number;
  email: string;
  role: "athlete" | "coach" | "scout";
  has_profile: boolean;
}

export interface AthleteProfile {
  id: number;
  username: string;
  name: string;
  age?: number | null;
  sport?: string | null;
  position?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  academy?: string | null;
  region?: string | null;
  bio?: string | null;
  verified: boolean;
  verified_by?: string | null;
  visibility?: string;
}

export interface PerformanceLog {
  id: number;
  date: string;
  duration_min?: number | null;
  distance_km?: number | null;
  sprint_time_sec?: number | null;
  vertical_jump_cm?: number | null;
  weight_lifted_kg?: number | null;
  notes?: string | null;
}

export interface AIReport {
  summary: string;
  strengths?: string | null;
  weaknesses?: string | null;
  drills?: string | null;
}

export interface JointAngles {
  left_knee?: number;
  right_knee?: number;
  left_hip?: number;
  right_hip?: number;
  left_ankle?: number;
  right_ankle?: number;
  left_shoulder?: number;
  right_shoulder?: number;
  left_elbow?: number;
  right_elbow?: number;
  trunk_lean?: number;
}

export interface FrameSample {
  t: number;
  lm: Record<string, [number, number]>;
  ang: JointAngles;
}

export interface MovementPhase {
  name: string;
  t: number;
}

export interface VideoItem {
  id: number;
  title: string;
  tags?: string | null;
  uploaded_at: string;
  visibility: string;
  coach_comment?: string | null;
  sport?: string | null;
  movement?: string | null;
  camera_angle?: string | null;
  duration_sec?: number | null;
  fps?: number | null;
  frame_count?: number | null;
  motion_score?: number | null;
  est_max_speed_score?: number | null;
  avg_knee_angle_deg?: number | null;
  avg_trunk_lean_deg?: number | null;
  estimated_cadence_spm?: number | null;
  pose_summary?: string | null;
  score_technique?: number | null;
  score_stability?: number | null;
  score_symmetry?: number | null;
  score_efficiency?: number | null;
  score_overall?: number | null;
  phases?: MovementPhase[] | null;
  frame_series?: FrameSample[] | null;
  ai_report?: AIReport | null;
}

export interface Portfolio {
  profile: AthleteProfile;
  performance_logs: PerformanceLog[];
  videos: VideoItem[];
}

export interface ScoutResult {
  username: string;
  name: string;
  sport?: string | null;
  position?: string | null;
  age?: number | null;
  region?: string | null;
  verified: boolean;
}
