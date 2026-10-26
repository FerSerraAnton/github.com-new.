"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export interface PresenceMeta {
  participant_id?: string;
  team_id?: string | null;
  role: "student" | "teacher" | "viewer";
}

/**
 * Presencia en tiempo real (quién tiene la app abierta ahora mismo).
 * Devuelve el conjunto de participant_id conectados en la sesión.
 */
export function usePresence(sessionId: string | null | undefined, me: PresenceMeta | null) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const meKey = me ? `${me.role}:${me.participant_id ?? "x"}:${me.team_id ?? "x"}` : null;

  useEffect(() => {
    if (!sessionId || !me) return;
    const sb = getSupabase();
    const channel = sb.channel(`presence:${sessionId}`, {
      config: { presence: { key: me.participant_id ?? `${me.role}-${Math.random().toString(36).slice(2)}` } },
    });
    const sync = () => {
      const st = channel.presenceState<PresenceMeta>();
      const ids = new Set<string>();
      Object.values(st).forEach((metas) => metas.forEach((m) => m.participant_id && ids.add(m.participant_id)));
      setOnline(ids);
    };
    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track(me);
      });
    return () => {
      void sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, meKey]);

  return online;
}
