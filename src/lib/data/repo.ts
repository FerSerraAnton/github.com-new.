import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_WORK, WORK_TABLES,
  type Activity, type ClassroomSession, type Participant, type SessionBundle, type Team, type WorkData,
} from "../types";

export interface Scope {
  sessionId: string;
  /** Si se indica, solo se cargan los datos de ese equipo (vista de alumno). */
  teamId?: string | null;
}

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const fetchSession = (sb: SupabaseClient, id: string) =>
  must<ClassroomSession>(sb.from("classroom_sessions").select("*").eq("id", id).single());

export const fetchTeams = (sb: SupabaseClient, sessionId: string) =>
  must<Team[]>(sb.from("teams").select("*").eq("session_id", sessionId).order("position"));

export const fetchActivities = (sb: SupabaseClient, sessionId: string) =>
  must<Activity[]>(sb.from("activities").select("*").eq("session_id", sessionId).order("position"));

export const fetchParticipants = (sb: SupabaseClient, sessionId: string) =>
  must<Participant[]>(
    sb.from("participants").select("id, session_id, team_id, user_id, alias, is_demo, joined_at").eq("session_id", sessionId).order("joined_at"),
  );

export async function fetchWorkTable<K extends keyof WorkData>(sb: SupabaseClient, key: K, scope: Scope): Promise<WorkData[K]> {
  let q = sb.from(WORK_TABLES[key]).select("*");
  q = scope.teamId ? q.eq("team_id", scope.teamId) : q.eq("session_id", scope.sessionId);
  return must<WorkData[K]>(q.limit(5000));
}

export async function fetchWork(sb: SupabaseClient, scope: Scope): Promise<WorkData> {
  const keys = Object.keys(WORK_TABLES) as (keyof WorkData)[];
  const values = await Promise.all(keys.map((k) => fetchWorkTable(sb, k, scope)));
  const work = { ...EMPTY_WORK } as WorkData;
  keys.forEach((k, i) => ((work as unknown as Record<string, unknown>)[k] = values[i]));
  return work;
}

export async function fetchBundle(sb: SupabaseClient, scope: Scope): Promise<SessionBundle> {
  const [session, teams, activities, participants, work] = await Promise.all([
    fetchSession(sb, scope.sessionId),
    fetchTeams(sb, scope.sessionId),
    fetchActivities(sb, scope.sessionId),
    fetchParticipants(sb, scope.sessionId),
    fetchWork(sb, scope),
  ]);
  return { session, teams, activities, participants, work };
}
