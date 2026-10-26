"use client";
import { useEffect, useState } from "react";
import type { ClassroomSession } from "@/lib/types";

export interface TimerState {
  /** segundos restantes (negativo si se ha pasado del tiempo) */
  remaining: number | null;
  running: boolean;
  paused: boolean;
  expired: boolean;
}

export function computeTimer(
  session: Pick<ClassroomSession, "timer_ends_at" | "timer_paused_remaining"> | null,
  now: number,
): TimerState {
  if (!session) return { remaining: null, running: false, paused: false, expired: false };
  if (session.timer_paused_remaining !== null && session.timer_paused_remaining !== undefined) {
    const r = session.timer_paused_remaining;
    return { remaining: r, running: false, paused: true, expired: r <= 0 };
  }
  if (session.timer_ends_at) {
    const r = Math.round((new Date(session.timer_ends_at).getTime() - now) / 1000);
    return { remaining: r, running: true, paused: false, expired: r <= 0 };
  }
  return { remaining: null, running: false, paused: false, expired: false };
}

export function useTimer(session: Pick<ClassroomSession, "timer_ends_at" | "timer_paused_remaining"> | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return computeTimer(session, now);
}

export function formatClock(seconds: number) {
  const s = Math.abs(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${seconds < 0 ? "+" : ""}${m}:${sec.toString().padStart(2, "0")}`;
}
