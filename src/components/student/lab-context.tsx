"use client";
import { createContext, useContext } from "react";
import type { Activity, Participant, SessionBundle, Team } from "@/lib/types";

export interface LabCtx {
  bundle: SessionBundle;
  me: Participant;
  team: Team;
  /** participant_id conectados ahora mismo */
  online: Set<string>;
  /** ¿Puede escribir el alumno en esta actividad? */
  canWrite: (a: Activity) => boolean;
  aliasOf: (participantId: string | null) => string;
}

const Ctx = createContext<LabCtx | null>(null);
export const LabProvider = Ctx.Provider;

export function useLab() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLab fuera de LabProvider");
  return v;
}
