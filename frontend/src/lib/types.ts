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

export interface VideoItem {
  id: number;
  title: string;
  tags?: string | null;
  uploaded_at: string;
  visibility: string;
  coach_comment?: string | null;
  duration_sec?: number | null;
  fps?: number | null;
  frame_count?: number | null;
  motion_score?: number | null;
  est_max_speed_score?: number | null;
  avg_knee_angle_deg?: number | null;
  avg_trunk_lean_deg?: number | null;
  estimated_cadence_spm?: number | null;
  pose_summary?: string | null;
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
