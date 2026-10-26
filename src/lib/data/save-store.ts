"use client";
import { useSyncExternalStore } from "react";
import { friendlyError } from "../domain/errors";

/**
 * Estado global de guardado: Guardando… / Guardado / Sin conexión / Cambios pendientes.
 * Las operaciones de escritura pasan por `track()`.
 */
interface SaveState {
  inflight: number;
  lastSavedAt: number | null;
  lastError: string | null;
  online: boolean;
  drafts: number;
}

let state: SaveState = { inflight: 0, lastSavedAt: null, lastError: null, online: true, drafts: 0 };
const listeners = new Set<() => void>();
const draftKeys = new Set<string>();

function set(patch: Partial<SaveState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSaveState() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function setOnline(online: boolean) {
  if (online !== state.online) set({ online });
}

export function markDraft(key: string, dirty: boolean) {
  if (dirty) draftKeys.add(key);
  else draftKeys.delete(key);
  if (draftKeys.size !== state.drafts) set({ drafts: draftKeys.size });
}

/** Ejecuta una escritura de Supabase y refleja su estado. Devuelve el mensaje de error o null. */
export async function track(op: () => PromiseLike<{ error: unknown }>): Promise<string | null> {
  set({ inflight: state.inflight + 1, lastError: null });
  try {
    const { error } = await op();
    if (error) {
      const msg = friendlyError(error);
      set({ inflight: state.inflight - 1, lastError: msg });
      return msg;
    }
    set({ inflight: state.inflight - 1, lastSavedAt: Date.now() });
    return null;
  } catch (e) {
    const msg = friendlyError(e);
    set({ inflight: state.inflight - 1, lastError: msg });
    return msg;
  }
}
