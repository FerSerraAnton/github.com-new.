"use client";
import { useCallback, useEffect, useState } from "react";
import { markDraft } from "@/lib/data/save-store";

/**
 * Borrador local de un campo: sobrevive a recargas y a cortes de red,
 * así no se pierde lo que el alumno estaba escribiendo.
 */
export function useDraft(key: string) {
  const storageKey = `ujl:draft:${key}`;
  const [value, setValueState] = useState("");

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey) ?? "";
      setValueState(v);
      markDraft(storageKey, v.trim().length > 0);
    } catch {
      /* almacenamiento no disponible */
    }
    return () => markDraft(storageKey, false);
  }, [storageKey]);

  const setValue = useCallback(
    (v: string) => {
      setValueState(v);
      markDraft(storageKey, v.trim().length > 0);
      try {
        if (v) localStorage.setItem(storageKey, v);
        else localStorage.removeItem(storageKey);
      } catch {
        /* ignorar */
      }
    },
    [storageKey],
  );

  return [value, setValue] as const;
}
