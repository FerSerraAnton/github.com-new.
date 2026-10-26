"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Pause, Play, Plus, Presentation, RotateCcw, Square, MonitorPlay } from "lucide-react";
import { finishSession, nextActivity, reopenSession, setActivityStatus, startClass, timerAdd, timerPause, timerReset, timerResume, timerStop, updateSession } from "@/lib/data/teacher";
import type { SessionBundle } from "@/lib/types";
import type { TimerState } from "@/hooks/use-timer";
import { Alert, Button } from "@/components/ui/primitives";
import { PhaseChip, TimerPill } from "@/components/ui/brand";

/** Control de la clase: iniciar, avanzar/retroceder, temporizador y diapositiva recomendada. */
export function SessionControls({ bundle, timer }: { bundle: SessionBundle; timer: TimerState }) {
  const { session, activities } = bundle;
  const current = activities.find((a) => a.id === session.current_activity_id) ?? null;
  const idx = current ? activities.indexOf(current) : -1;
  const next = activities[idx + 1];
  const prev = idx > 0 ? activities[idx - 1] : null;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    const e = await fn();
    setBusy(null);
    setError(e);
  };

  // Bloqueo automático al acabar el tiempo, solo si el profesor lo habilitó.
  const locked = useRef<string | null>(null);
  useEffect(() => {
    if (session.auto_lock_on_timeout && timer.expired && current?.status === "active" && locked.current !== current.id) {
      locked.current = current.id;
      void setActivityStatus(current.id, "locked");
    }
  }, [session.auto_lock_on_timeout, timer.expired, current?.id, current?.status]);

  if (session.status === "draft" || !current) {
    return (
      <section className="rounded-2xl bg-navy-900 p-6 text-white shadow-lift">
        <p className="text-sm font-semibold text-white/60">Cuando los equipos estén formados…</p>
        <h2 className="mt-1 text-2xl font-extrabold">Todo listo para empezar</h2>
        <p className="mt-1 text-white/70">
          Primera actividad: <b className="text-white">{activities[0]?.title}</b>
          {activities[0]?.slide_number && ` · diapositiva ${activities[0].slide_number}`}
        </p>
        <Button variant="secondary" size="xl" className="mt-5 border-0 text-navy-900" loading={busy === "start"} onClick={() => run("start", () => startClass(bundle))}>
          <Play className="h-5 w-5" /> INICIAR CLASE
        </Button>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-navy-900 text-white shadow-lift">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
              Actividad {current.position} de {activities.length}
            </span>
            {current.phase_key && <PhaseChip phase={current.phase_key} />}
            <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-extrabold text-navy-950">
              <Presentation className="mr-1 inline h-3.5 w-3.5" />
              Diapositiva {current.slide_number || "—"}
            </span>
            {session.status === "finished" && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-navy-900">Sesión finalizada</span>}
            {current.status === "locked" && <span className="rounded-full bg-red-400 px-2.5 py-1 text-xs font-bold text-navy-950">Bloqueada</span>}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{current.title}</h2>
          <p className="mt-1 text-white/70">{current.question}</p>
          {next && (
            <p className="mt-3 text-sm text-white/55">
              Después: {next.title}
              {next.slide_number && ` · diapositiva ${next.slide_number}`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <TimerPill timer={timer} minutes={current.recommended_minutes} large />
          <div className="flex flex-wrap gap-1.5">
            {timer.running ? (
              <Button size="sm" variant="secondary" onClick={() => run("t", () => timerPause(session))}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
            ) : timer.paused ? (
              <Button size="sm" variant="secondary" onClick={() => run("t", () => timerResume(session))}>
                <Play className="h-4 w-4" /> Reanudar
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => run("t", () => timerAdd(session, 60))} aria-label="Añadir un minuto">
              <Plus className="h-4 w-4" /> 1 min
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run("t", () => timerReset(session, current.recommended_minutes))} aria-label="Reiniciar temporizador">
              <RotateCcw className="h-4 w-4" />
            </Button>
            {(timer.running || timer.paused) && (
              <Button size="sm" variant="secondary" onClick={() => run("t", () => timerStop(session))} aria-label="Quitar temporizador">
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/75">
            <input type="checkbox" className="h-4 w-4 accent-amber-300" checked={session.auto_lock_on_timeout} onChange={(e) => updateSession(session.id, { auto_lock_on_timeout: e.target.checked })} />
            Bloquear automáticamente al acabar el tiempo
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-navy-950/40 px-5 py-3 sm:px-6">
        <Button variant="ghost" className="text-white hover:bg-white/10" disabled={!prev} loading={busy === "prev"} onClick={() => run("prev", () => nextActivity(bundle, -1))}>
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        {current.status === "active" ? (
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => run("lock", () => setActivityStatus(current.id, "locked"))}>
            Bloquear
          </Button>
        ) : (
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => run("lock", () => setActivityStatus(current.id, "active"))}>
            Desbloquear
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => window.open(`/proyectar/${session.id}`, "_blank")}>
          <MonitorPlay className="h-4 w-4" /> PROYECTAR RESULTADOS
        </Button>
        {session.status === "finished" ? (
          <Button variant="secondary" onClick={() => run("reopen", () => reopenSession(session.id))}>
            Reabrir sesión
          </Button>
        ) : next ? (
          <Button variant="secondary" size="lg" className="border-0 text-navy-900" loading={busy === "next"} onClick={() => run("next", () => nextActivity(bundle, 1))}>
            SIGUIENTE ACTIVIDAD <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="border-0 text-navy-900"
            loading={busy === "finish"}
            onClick={() => confirm("¿Finalizar la sesión? Los alumnos ya no podrán editar (podrás reabrirla).") && run("finish", () => finishSession(bundle))}
          >
            <Flag className="h-5 w-5" /> Finalizar sesión
          </Button>
        )}
      </div>
      {error && <Alert tone="error" className="m-4">{error}</Alert>}
    </section>
  );
}
