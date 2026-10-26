"use client";
import type { PhaseKey } from "../config/phases";
import { getSupabase } from "../supabase/client";
import { track } from "./save-store";
import type { Activity, Participant, TeamJourneySummary } from "../types";
import type { Severity } from "../config/catalogs";

/** Escrituras de alumnos. La autorización real la impone RLS en PostgreSQL. */
const sb = () => getSupabase();

const base = (activity: Activity, me: Participant) => ({
  team_id: me.team_id!,
  activity_id: activity.id,
  participant_id: me.id,
});

export const addContribution = (activity: Activity, me: Participant, field_key: string, content: string) =>
  track(() =>
    sb().from("contributions").insert({ ...base(activity, me), field_key, content: content.trim(), phase_key: activity.phase_key }),
  );

export const updateContribution = (id: string, content: string) =>
  track(() => sb().from("contributions").update({ content: content.trim() }).eq("id", id));

export const setContributionSelected = (id: string, selected: boolean) =>
  track(() => sb().rpc("set_contribution_selected", { p_contribution_id: id, p_selected: selected }));

export const deleteRow = (table: string, id: string) => track(() => sb().from(table).delete().eq("id", id));

export const addTouchpoint = (activity: Activity, me: Participant, phase: PhaseKey, t: { channel: string; channel_type: "digital" | "fisico"; description: string }) =>
  track(() => sb().from("touchpoints").insert({ ...base(activity, me), phase_key: phase, ...t }));

export const upsertEmotionVote = (activity: Activity, me: Participant, phase: PhaseKey, value: number, reason: string) =>
  track(() =>
    sb()
      .from("emotion_votes")
      .upsert({ ...base(activity, me), phase_key: phase, value, reason: reason.trim() }, { onConflict: "participant_id,phase_key" }),
  );

export const setTeamEmotion = (me: Participant, phase: PhaseKey, value: number, reason: string) =>
  track(() =>
    sb()
      .from("team_emotion_selections")
      .upsert({ team_id: me.team_id!, phase_key: phase, value, reason: reason.trim(), chosen_by: me.id, updated_at: new Date().toISOString() }, { onConflict: "team_id,phase_key" }),
  );

export const clearTeamEmotion = (teamId: string, phase: PhaseKey) =>
  track(() => sb().from("team_emotion_selections").delete().eq("team_id", teamId).eq("phase_key", phase));

export const addFriction = (
  activity: Activity, me: Participant,
  f: { title: string; description: string; phase_key: PhaseKey; severity: Severity; customer_impact: string; business_impact: string },
) => track(() => sb().from("frictions").insert({ ...base(activity, me), ...f }));

export const addImprovement = (
  activity: Activity, me: Participant,
  m: { friction_id: string | null; problem: string; solution: string; channel: string; phase_key: PhaseKey; benefit: string; priority: Severity },
) => track(() => sb().from("improvements").insert({ ...base(activity, me), ...m }));

export const toggleImprovementVote = (me: Participant, improvementId: string, voted: boolean) =>
  voted
    ? track(() => sb().from("improvement_votes").delete().eq("improvement_id", improvementId).eq("participant_id", me.id))
    : track(() => sb().from("improvement_votes").insert({ improvement_id: improvementId, participant_id: me.id, team_id: me.team_id! }));

export const addKpi = (
  activity: Activity, me: Participant,
  k: { name: string; is_custom: boolean; measure_what: string; phase_key: PhaseKey; data_source: string; decision: string; improvement_id: string | null },
) => track(() => sb().from("kpis").insert({ ...base(activity, me), ...k }));

export const setActivityDone = (me: Participant, activity: Activity, done: boolean) =>
  track(() =>
    sb()
      .from("team_activity_states")
      .upsert(
        { team_id: me.team_id!, activity_id: activity.id, status: done ? "done" : "working", updated_by: me.id, updated_at: new Date().toISOString() },
        { onConflict: "team_id,activity_id" },
      ),
  );

export const upsertSummary = (me: Participant, s: Pick<TeamJourneySummary, "detected" | "detected_phase" | "proposal" | "because" | "measure_with" | "conclusion">) =>
  track(() =>
    sb()
      .from("team_journey_summaries")
      .upsert({ team_id: me.team_id!, ...s, updated_by: me.id, updated_at: new Date().toISOString() }, { onConflict: "team_id" }),
  );
