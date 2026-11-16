"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Guarda automáticamente un valor mientras se escribe: espera `delay` ms sin cambios
 * (o a que el campo pierda el foco) y llama a `save`. Las escrituras se encadenan
 * en orden, así que nunca hay dos a la vez para el mismo campo. Si falla (sin red),
 * reintenta al recuperar la conexión.
 */
export function useAutosave<T>(save: (value: T) => Promise<string | null>, delay = 800) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef(save);
  const latest = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const job = latest.current;
    if (!job) return chain.current;
    latest.current = null;
    chain.current = chain.current.then(async () => {
      setStatus("saving");
      const err = await saveRef.current(job.value);
      if (err) {
        // Si no hay nada más nuevo en cola, se reintenta este valor más tarde.
        if (!latest.current) latest.current = job;
        setError(err);
        setStatus("error");
      } else {
        setError(null);
        setStatus(latest.current ? "pending" : "saved");
      }
    });
    return chain.current;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      latest.current = { value };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const retry = () => void flush();
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
      void flush(); // al desmontar (cambio de actividad) no se pierde lo pendiente
    };
  }, [flush]);

  return { schedule, flush, status, error, dirty: status === "pending" || status === "saving" || status === "error" };
}
