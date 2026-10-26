"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import {
  fetchActivities, fetchBundle, fetchParticipants, fetchSession, fetchTeams, fetchWorkTable, type Scope,
} from "@/lib/data/repo";
import { setOnline } from "@/lib/data/save-store";
import { friendlyError } from "@/lib/domain/errors";
import { WORK_TABLES, type SessionBundle, type WorkData } from "@/lib/types";

export type Connection = "connecting" | "online" | "offline";
type Part = "session" | "teams" | "activities" | "participants" | keyof WorkData;

/**
 * Carga una sesión (y el trabajo de un equipo, o de todos) y la mantiene sincronizada
 * con Supabase Realtime. Ante cualquier cambio vuelve a leer la tabla afectada, de modo
 * que la fuente de verdad siempre es PostgreSQL (con RLS aplicada).
 */
export function useLiveBundle(scope: Scope | null) {
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const timers = useRef<Map<Part, ReturnType<typeof setTimeout>>>(new Map());
  const sessionId = scope?.sessionId;
  const teamId = scope?.teamId ?? null;

  const reloadAll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const b = await fetchBundle(getSupabase(), { sessionId, teamId });
      setBundle(b);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [sessionId, teamId]);

  const reloadPart = useCallback(
    (part: Part) => {
      if (!sessionId) return;
      const existing = timers.current.get(part);
      if (existing) clearTimeout(existing);
      timers.current.set(
        part,
        setTimeout(async () => {
          timers.current.delete(part);
          const sb = getSupabase();
          try {
            if (part === "session") {
              const session = await fetchSession(sb, sessionId);
              setBundle((b) => (b ? { ...b, session } : b));
            } else if (part === "teams") {
              const teams = await fetchTeams(sb, sessionId);
              setBundle((b) => (b ? { ...b, teams } : b));
            } else if (part === "activities") {
              const activities = await fetchActivities(sb, sessionId);
              setBundle((b) => (b ? { ...b, activities } : b));
            } else if (part === "participants") {
              const participants = await fetchParticipants(sb, sessionId);
              setBundle((b) => (b ? { ...b, participants } : b));
            } else {
              const rows = await fetchWorkTable(sb, part, { sessionId, teamId });
              setBundle((b) => (b ? { ...b, work: { ...b.work, [part]: rows } } : b));
            }
          } catch {
            // Un fallo puntual de lectura se corrige en la siguiente recarga completa.
          }
        }, 120),
      );
    },
    [sessionId, teamId],
  );

  useEffect(() => {
    if (!sessionId) return;
    const sb = getSupabase();
    let cancelled = false;
    let wasDown = false;
    void reloadAll();

    const channel: RealtimeChannel = sb.channel(`live:${sessionId}:${teamId ?? "all"}:${Math.random().toString(36).slice(2)}`);
    const on = (table: string, filter: string | undefined, part: Part, events: ("INSERT" | "UPDATE" | "DELETE" | "*")[] = ["*"]) => {
      for (const event of events) {
        channel.on(
          "postgres_changes" as never,
          { event, schema: "public", table, ...(filter ? { filter } : {}) } as never,
          (() => reloadPart(part)) as never,
        );
      }
    };
    on("classroom_sessions", `id=eq.${sessionId}`, "session", ["UPDATE"]);
    on("activities", `session_id=eq.${sessionId}`, "activities", ["INSERT", "UPDATE"]);
    on("activities", undefined, "activities", ["DELETE"]);
    on("teams", `session_id=eq.${sessionId}`, "teams", ["INSERT", "UPDATE"]);
    on("teams", undefined, "teams", ["DELETE"]);
    on("participants", `session_id=eq.${sessionId}`, "participants", ["INSERT", "UPDATE"]);
    on("participants", undefined, "participants", ["DELETE"]);
    const filter = teamId ? `team_id=eq.${teamId}` : `session_id=eq.${sessionId}`;
    for (const [key, table] of Object.entries(WORK_TABLES) as [keyof WorkData, string][]) {
      on(table, filter, key, ["INSERT", "UPDATE"]);
      // Los DELETE de Realtime no admiten filtro: solo traen la clave primaria.
      on(table, undefined, key, ["DELETE"]);
    }

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        setConnection("online");
        setOnline(true);
        if (wasDown) void reloadAll(); // recuperar lo que pasó mientras estábamos desconectados
        wasDown = false;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        wasDown = true;
        setConnection("offline");
        setOnline(false);
      }
    });

    const goOnline = () => {
      setOnline(true);
      void reloadAll();
    };
    const goOffline = () => {
      setConnection("offline");
      setOnline(false);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void reloadAll();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisible);
    const pending = timers.current;

    return () => {
      cancelled = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
      void sb.removeChannel(channel);
    };
  }, [sessionId, teamId, reloadAll, reloadPart]);

  return { bundle, error, connection, reload: reloadAll, reloadPart };
}
