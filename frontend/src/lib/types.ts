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
  athlete_id?: number;
  date: string;
  duration_min?: number | null;
  distance_km?: number | null;
  sprint_time_sec?: number | null;
  vertical_jump_cm?: number | null;
  weight_lifted_kg?: number | null;
  notes?: string | null;
  sport_type?: string | null;
  event?: string | null;
  training_hours_per_week?: number | null;
  average_heart_rate?: number | null;
  bmi?: number | null;
  sleep_hours_per_night?: number | null;
  daily_caloric_intake?: number | null;
  hydration_level?: number | null;
  injury_history?: string | null;
  previous_competition_performance?: number | null;
  training_intensity?: string | null;
  resting_heart_rate?: number | null;
  body_fat_percentage?: number | null;
  vo2_max?: number | null;
  event_distance?: number | null;
  altitude_training?: string | null;
  mental_focus_level?: number | null;
  performance_metric?: number | null;
}

export interface DailyCheckin {
  id: number;
  athlete_id: number;
  date: string;
  total_steps: number;
  calories: number;
  very_active_minutes: number;
  fairly_active_minutes: number;
  lightly_active_minutes: number;
  sedentary_minutes: number;
  total_minutes_asleep: number;
  total_time_in_bed: number;
  avg_heart_rate: number;
  readiness_score?: number | null;
  recommendation?: string | null;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface MetricTrend {
  metric: string;
  label: string;
  unit: string;
  points: TrendPoint[];
  change_pct?: number | null;
  best_month?: string | null;
}

export interface Trends {
  sprint_time: MetricTrend;
  vertical_jump: MetricTrend;
  weekly_sessions: TrendPoint[];
  consistency_pct?: number | null;
  insights: string[];
}

export interface PersonalRecordEntry {
  metric: string;
  label: string;
  unit: string;
  value: number;
  date: string;
  is_current_best: boolean;
}

export interface Prediction {
  metric: string;
  label: string;
  unit: string;
  current?: number | null;
  predicted_30d?: number | null;
  predicted_90d?: number | null;
  confidence_pct?: number | null;
  note?: string | null;
}

export interface InjuryRisk {
  risk_pct: number;
  risk_band: "low" | "moderate" | "high" | "critical";
  reasons: string[];
}

export interface Readiness {
  readiness_pct?: number | null;
  recommendation?: string | null;
  checked_in_today: boolean;
}

export interface IntelligenceSummary {
  sprint_pb?: number | null;
  sprint_trend_pct?: number | null;
  new_pb_days_ago?: number | null;
  predicted_next_month?: number | null;
  injury_risk_pct?: number | null;
  injury_risk_band?: string | null;
  readiness_pct?: number | null;
  readiness_recommendation?: string | null;
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
