import type { ActivityConfig, ActivityKind } from "./config/activities";
import type { PhaseKey } from "./config/phases";
import type { Severity } from "./config/catalogs";

export type SessionStatus = "draft" | "live" | "finished";
export type ActivityStatus = "pending" | "active" | "locked" | "completed";

export interface ClassroomSession {
  id: string;
  teacher_id: string;
  code: string;
  title: string;
  subtitle: string;
  company: string;
  scenario: string;
  instructions: string;
  max_per_team: number;
  status: SessionStatus;
  current_activity_id: string | null;
  timer_ends_at: string | null;
  timer_paused_remaining: number | null;
  auto_lock_on_timeout: boolean;
  comparison_enabled: boolean;
  share_enabled: boolean;
  share_token: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  name: string;
  color: string;
  position: number;
}

export interface Participant {
  id: string;
  session_id: string;
  team_id: string | null;
  user_id: string | null;
  alias: string;
  is_demo: boolean;
  joined_at: string;
}

export interface Activity {
  id: string;
  session_id: string;
  position: number;
  key: string;
  kind: ActivityKind;
  phase_key: PhaseKey | null;
  title: string;
  objective: string;
  instructions: string;
  question: string;
  example: string;
  recommended_minutes: number;
  slide_number: string;
  config: ActivityConfig;
  status: ActivityStatus;
}

export interface TeamActivityState {
  team_id: string;
  activity_id: string;
  session_id: string;
  status: "working" | "done";
  updated_by: string | null;
  updated_at: string;
}

export interface Contribution {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  field_key: string;
  phase_key: PhaseKey | null;
  content: string;
  selected: boolean;
  created_at: string;
}

export interface Touchpoint {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  phase_key: PhaseKey;
  channel: string;
  channel_type: "digital" | "fisico";
  description: string;
  created_at: string;
}

export interface EmotionVote {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  phase_key: PhaseKey;
  value: number;
  reason: string;
  updated_at: string;
}

export interface TeamEmotionSelection {
  id: string;
  session_id: string;
  team_id: string;
  phase_key: PhaseKey;
  value: number;
  reason: string;
  chosen_by: string | null;
  updated_at: string;
}

export interface Friction {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  title: string;
  description: string;
  phase_key: PhaseKey;
  severity: Severity;
  customer_impact: string;
  business_impact: string;
  created_at: string;
}

export interface Improvement {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  friction_id: string | null;
  problem: string;
  solution: string;
  channel: string;
  phase_key: PhaseKey;
  benefit: string;
  priority: Severity;
  created_at: string;
}

export interface ImprovementVote {
  id: string;
  session_id: string;
  team_id: string;
  improvement_id: string;
  participant_id: string;
}

export interface Kpi {
  id: string;
  session_id: string;
  team_id: string;
  activity_id: string;
  participant_id: string;
  name: string;
  is_custom: boolean;
  measure_what: string;
  phase_key: PhaseKey;
  data_source: string;
  decision: string;
  improvement_id: string | null;
  created_at: string;
}

export interface TeamJourneySummary {
  team_id: string;
  session_id: string;
  detected: string;
  detected_phase: string;
  proposal: string;
  because: string;
  measure_with: string;
  conclusion: string;
  updated_by: string | null;
  updated_at: string;
}

/** Todo lo que un equipo ha producido (o todos los equipos, para el profesor). */
export interface WorkData {
  states: TeamActivityState[];
  contributions: Contribution[];
  touchpoints: Touchpoint[];
  emotionVotes: EmotionVote[];
  emotionSelections: TeamEmotionSelection[];
  frictions: Friction[];
  improvements: Improvement[];
  improvementVotes: ImprovementVote[];
  kpis: Kpi[];
  summaries: TeamJourneySummary[];
}

export interface SessionBundle {
  session: ClassroomSession;
  teams: Team[];
  activities: Activity[];
  participants: Participant[];
  work: WorkData;
}

export const EMPTY_WORK: WorkData = {
  states: [],
  contributions: [],
  touchpoints: [],
  emotionVotes: [],
  emotionSelections: [],
  frictions: [],
  improvements: [],
  improvementVotes: [],
  kpis: [],
  summaries: [],
};

/** Correspondencia entre clave de WorkData y tabla de Postgres. */
export const WORK_TABLES: Record<keyof WorkData, string> = {
  states: "team_activity_states",
  contributions: "contributions",
  touchpoints: "touchpoints",
  emotionVotes: "emotion_votes",
  emotionSelections: "team_emotion_selections",
  frictions: "frictions",
  improvements: "improvements",
  improvementVotes: "improvement_votes",
  kpis: "kpis",
  summaries: "team_journey_summaries",
};
