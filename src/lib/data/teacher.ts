"use client";
import { DEFAULT_ACTIVITIES, type ActivityTemplate } from "../config/activities";
import { TEAM_COLORS } from "../config/catalogs";
import { getSupabase } from "../supabase/client";
import { track } from "./save-store";
import type { Activity, ActivityStatus, ClassroomSession, SessionBundle } from "../types";

/** Operaciones del profesor. RLS garantiza que solo afecten a sus propias sesiones. */
const sb = () => getSupabase();

export interface NewSessionInput {
  title: string;
  company: string;
  scenario: string;
  instructions: string;
  max_per_team: number;
  team_count: number;
  is_demo?: boolean;
  activities?: ActivityTemplate[];
}

export async function createSession(input: NewSessionInput): Promise<{ id?: string; error?: string }> {
  const teams = Array.from({ length: input.team_count }, (_, i) => ({ name: `Equipo ${i + 1}`, color: TEAM_COLORS[i % TEAM_COLORS.length] }));
  let id: string | undefined;
  const error = await track(async () => {
    const r = await sb().rpc("create_session", {
      p: {
        title: input.title,
        company: input.company,
        scenario: input.scenario,
        instructions: input.instructions,
        max_per_team: input.max_per_team,
        is_demo: input.is_demo ?? false,
        teams,
        activities: input.activities ?? DEFAULT_ACTIVITIES,
      },
    });
    id = r.data as string | undefined;
    return r;
  });
  return error ? { error } : { id };
}

export const updateSession = (id: string, patch: Partial<ClassroomSession>) =>
  track(() => sb().from("classroom_sessions").update(patch).eq("id", id));

export const updateActivity = (id: string, patch: Partial<Activity>) => track(() => sb().from("activities").update(patch).eq("id", id));

export const setActivityStatus = (id: string, status: ActivityStatus) => updateActivity(id, { status });

const endsAt = (minutes: number) => (minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null);

/** Activa una actividad: la anterior queda finalizada (consultable) y el temporizador se reinicia. */
export async function goToActivity(bundle: SessionBundle, target: Activity) {
  const { session, activities } = bundle;
  const current = activities.find((a) => a.id === session.current_activity_id);
  if (current && current.id !== target.id && current.status === "active") {
    const e = await setActivityStatus(current.id, "completed");
    if (e) return e;
  }
  const e1 = await setActivityStatus(target.id, "active");
  if (e1) return e1;
  return updateSession(session.id, {
    status: "live",
    current_activity_id: target.id,
    timer_ends_at: endsAt(target.recommended_minutes),
    timer_paused_remaining: null,
  });
}

export function startClass(bundle: SessionBundle) {
  const first = bundle.activities[0];
  if (!first) return Promise.resolve("La sesión no tiene actividades.");
  return goToActivity(bundle, first);
}

export function nextActivity(bundle: SessionBundle, dir: 1 | -1) {
  const cur = bundle.activities.find((a) => a.id === bundle.session.current_activity_id);
  const idx = cur ? bundle.activities.indexOf(cur) : -1;
  const target = bundle.activities[idx + dir];
  if (!target) return Promise.resolve(null);
  return goToActivity(bundle, target);
}

export async function finishSession(bundle: SessionBundle) {
  const cur = bundle.activities.find((a) => a.id === bundle.session.current_activity_id);
  if (cur?.status === "active") await setActivityStatus(cur.id, "completed");
  return updateSession(bundle.session.id, { status: "finished", timer_ends_at: null, timer_paused_remaining: null });
}

export const reopenSession = (id: string) => updateSession(id, { status: "live" });

// ---- temporizador
export function timerPause(s: ClassroomSession) {
  if (!s.timer_ends_at) return Promise.resolve(null);
  const remaining = Math.round((new Date(s.timer_ends_at).getTime() - Date.now()) / 1000);
  return updateSession(s.id, { timer_ends_at: null, timer_paused_remaining: remaining });
}
export function timerResume(s: ClassroomSession) {
  const r = s.timer_paused_remaining ?? 0;
  return updateSession(s.id, { timer_ends_at: new Date(Date.now() + r * 1000).toISOString(), timer_paused_remaining: null });
}
export function timerAdd(s: ClassroomSession, seconds: number) {
  if (s.timer_paused_remaining !== null) return updateSession(s.id, { timer_paused_remaining: s.timer_paused_remaining + seconds });
  const base = s.timer_ends_at ? Math.max(Date.now(), new Date(s.timer_ends_at).getTime()) : Date.now();
  return updateSession(s.id, { timer_ends_at: new Date(base + seconds * 1000).toISOString() });
}
export const timerReset = (s: ClassroomSession, minutes: number) => updateSession(s.id, { timer_ends_at: endsAt(minutes), timer_paused_remaining: null });
export const timerStop = (s: ClassroomSession) => updateSession(s.id, { timer_ends_at: null, timer_paused_remaining: null });

// ---- equipos y participantes
export const moveParticipant = (id: string, teamId: string | null) => track(() => sb().from("participants").update({ team_id: teamId }).eq("id", id));
export const removeParticipant = (id: string) => track(() => sb().from("participants").delete().eq("id", id));

export function addTeam(bundle: SessionBundle) {
  const n = bundle.teams.length + 1;
  let name = `Equipo ${n}`;
  let i = n;
  while (bundle.teams.some((t) => t.name === name)) name = `Equipo ${++i}`;
  return track(() =>
    sb().from("teams").insert({ session_id: bundle.session.id, name, color: TEAM_COLORS[(n - 1) % TEAM_COLORS.length], position: n }),
  );
}
export const renameTeam = (id: string, name: string) => track(() => sb().from("teams").update({ name: name.trim() }).eq("id", id));
export const deleteTeam = (id: string) => track(() => sb().from("teams").delete().eq("id", id));

export const deleteSession = (id: string) => track(() => sb().from("classroom_sessions").delete().eq("id", id));
