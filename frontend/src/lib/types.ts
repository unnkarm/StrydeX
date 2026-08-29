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
  competition_category?: "men" | "women" | null;
  environment?: "outdoor" | "indoor" | null;
  result_value?: number | null;
  result_unit?: "seconds" | "metres" | "points" | null;
  scoring_event_code?: string | null;
  world_athletics_points?: number | null;
  scoring_version?: string | null;
  wind_speed_mps?: number | null;
  wind_legal?: boolean | null;
  approach_speed_mps?: number | null;
  takeoff_velocity_mps?: number | null;
  takeoff_angle_deg?: number | null;
  takeoff_contact_time_ms?: number | null;
  approach_consistency_pct?: number | null;
  board_accuracy_cm?: number | null;
  takeoff_distance_cm?: number | null;
  reactive_strength_index?: number | null;
  fatigue_score?: number | null;
  soreness_score?: number | null;
  session_rpe?: number | null;
  pain_present?: boolean | null;
}

export interface AthleticsScore {
  competition_category: "men" | "women";
  event: string;
  event_code: string;
  event_family: string;
  environment: "outdoor" | "indoor";
  result_value: number;
  result_unit: "seconds" | "metres" | "points";
  world_athletics_points: number;
  performance_score: number;
  score_band: string;
  wind_speed_mps?: number | null;
  wind_legal?: boolean | null;
  scoring_version: string;
  notes: string[];
}

export interface AthleticsEvent {
  event: string;
  event_code: string;
  family: string;
  unit: "seconds" | "metres" | "points";
  environment: "outdoor" | "indoor";
}

export interface AthleticsImprovementPriority {
  priority: "high" | "medium" | "low";
  area: string;
  reason: string;
  actions: string[];
}

export interface AthleticsReview {
  overall_score?: number | null;
  score_band?: string | null;
  primary_event?: string | null;
  latest_result?: AthleticsScore | null;
  change_points?: number | null;
  confidence: string;
  historical_scores: { date: string; month: string; score: number; event: string }[];
  next_milestone?: Record<string, unknown> | null;
  improvement_priorities: AthleticsImprovementPriority[];
  context_completeness_pct: number;
  performance_drivers: {
    metric: string;
    label: string;
    latest_value: number;
    unit?: string | null;
    data_points: number;
    relationship: "positive_association" | "negative_association" | "inconclusive" | "insufficient_history";
    evidence: string;
  }[];
  body_context: {
    height_cm?: number | null;
    weight_kg?: number | null;
    bmi?: number | null;
    body_fat_percentage?: number | null;
    vertical_jump_cm?: number | null;
    strength_to_weight_ratio?: number | null;
  };
  personalised_model_status: "driver_analysis_ready" | "collecting_data" | "insufficient_data" | "not_applicable";
  personalised_model_note: string;
  model_note: string;
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
  overall_score?: number | null;
  overall_change_pct?: number | null;
  speed_score?: number | null;
  strength_score?: number | null;
  technique_score?: number | null;
  endurance_score?: number | null;
  focus_points?: string[] | null;
  historical_scores?: { date?: string; month: string; score: number; event?: string }[] | null;
  ai_recommendations?: {
    focus?: string;
    actions?: string[];
    all_priorities?: AthleticsImprovementPriority[];
    method?: string;
  } | null;
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
