"use client";
import { useState } from "react";
import { CheckCircle2, Lightbulb, Lock, PartyPopper, Target } from "lucide-react";
import { PHASE_BY_KEY } from "@/lib/config/phases";
import { setActivityDone } from "@/lib/data/mutations";
import { isTeamDone } from "@/lib/domain/journey";
import type { Activity } from "@/lib/types";
import { Alert, Button } from "@/components/ui/primitives";
import { PhaseIcon, TimerPill } from "@/components/ui/brand";
import { TouchpointEditor } from "@/components/journey/TouchpointEditor";
import { EmotionVotePanel } from "@/components/journey/EmotionVotePanel";
import { ContributionField } from "./ContributionField";
import { EmotionsReviewPanel, FrictionsPanel, ImprovementsPanel, KpisPanel, PitchPanel } from "./WorkPanels";
import { useLab } from "./lab-context";
import type { TimerState } from "@/hooks/use-timer";

export function ActivityWorkspace({ activity, timer, isCurrent }: { activity: Activity; timer: TimerState; isCurrent: boolean }) {
  const { bundle, team, me, canWrite } = useLab();
  const phase = activity.phase_key ? PHASE_BY_KEY[activity.phase_key] : null;
  const writable = canWrite(activity);
  const done = isTeamDone(bundle.work, team.id, activity.id);
  const [celebrate, setCelebrate] = useState(false);
  const accent = phase?.color ?? "#0A5FB4";

  const toggleDone = async () => {
    const err = await setActivityDone(me, activity, !done);
    if (!err && !done) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1400);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera de la actividad */}
      <section className="relative overflow-hidden rounded-2xl bg-white shadow-card" style={{ borderTop: `5px solid ${accent}` }}>
        <div className="p-5 sm:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white" style={{ background: accent }}>
              Actividad {activity.position}
            </span>
            {phase && (
              <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: phase.color }}>
                <PhaseIcon phase={phase.key} className="h-4 w-4" /> Fase {phase.position} · {phase.name}
              </span>
            )}
            <span className="ml-auto">{isCurrent && <TimerPill timer={timer} minutes={activity.recommended_minutes} />}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{activity.title}</h1>
          {activity.objective && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Target className="h-4 w-4" aria-hidden /> {activity.objective}
            </p>
          )}
          {activity.question && (
            <p className="mt-5 rounded-xl px-4 py-4 text-lg font-bold leading-snug text-navy-900 sm:text-xl" style={{ background: `${accent}12`, borderLeft: `4px solid ${accent}` }}>
              {activity.question}
            </p>
          )}
          {activity.instructions && <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{activity.instructions}</p>}
          {activity.example && (
            <details className="mt-3 rounded-xl bg-canvas px-4 py-3 text-sm">
              <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-brand">
                <Lightbulb className="h-4 w-4" /> Ver un ejemplo orientativo
              </summary>
              <p className="mt-2 text-ink/80">{activity.example}</p>
            </details>
          )}
        </div>
      </section>

      {!writable && activity.kind !== "welcome" && (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4" />
            {activity.status === "completed" ? "Actividad finalizada: puedes consultar las respuestas." : timer.expired && bundle.session.auto_lock_on_timeout ? "Se ha acabado el tiempo de esta actividad." : "Esta actividad está cerrada por el profesor."}
          </span>
        </Alert>
      )}

      <ActivityBody activity={activity} />

      {/* Cierre de la actividad por el equipo */}
      {activity.kind !== "welcome" || writable ? (
        <section className="relative flex flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-ink/80">
            {done ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Vuestro equipo ha marcado esta actividad como terminada.
              </span>
            ) : (
              "¿Habéis terminado? Marcadlo para que el profesor lo vea en su panel."
            )}
          </p>
          {bundle.session.status === "live" && (
            <Button variant={done ? "secondary" : "success"} onClick={toggleDone}>
              {done ? "Seguir trabajando" : activity.kind === "welcome" ? "¡Estamos listos!" : "Hemos terminado esta actividad"}
            </Button>
          )}
          {celebrate && (
            <span className="pointer-events-none absolute -top-4 right-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-lift animate-celebrate" aria-live="polite">
              <PartyPopper className="h-4 w-4" /> ¡Fase completada! +1
            </span>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ActivityBody({ activity }: { activity: Activity }) {
  const { bundle, team, online, aliasOf } = useLab();
  switch (activity.kind) {
    case "welcome": {
      const mates = bundle.participants.filter((p) => p.team_id === team.id);
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl bg-navy-900 p-5 text-white shadow-lift">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">El reto · {bundle.session.company}</p>
            <p className="mt-2 text-lg font-semibold leading-relaxed">{bundle.session.scenario}</p>
            {bundle.session.instructions && <p className="mt-3 text-sm text-white/75">{bundle.session.instructions}</p>}
          </section>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className="mb-3 font-extrabold text-navy-900">Tu equipo: {team.name}</h3>
            <ul className="space-y-2">
              {mates.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-[15px]">
                  <span className={`h-2.5 w-2.5 rounded-full ${online.has(m.id) ? "bg-emerald-500" : "bg-line"}`} aria-hidden />
                  {aliasOf(m.id)}
                  <span className="text-xs text-muted">{online.has(m.id) ? "conectado" : "desconectado"}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      );
    }
    case "need":
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          {activity.config.fields?.map((f) => (
            <div key={f.key} className={f.type === "choice" || f.key === "inicio" ? "lg:col-span-2" : ""}>
              <ContributionField activity={activity} field={f} />
            </div>
          ))}
        </div>
      );
    case "phase": {
      const fields = activity.config.fields ?? [];
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "choice" ? "lg:col-span-2" : ""}>
                <ContributionField activity={activity} field={f} />
              </div>
            ))}
          </div>
          {activity.config.touchpoints && activity.phase_key && <TouchpointEditor activity={activity} phase={activity.phase_key} label={activity.config.touchpoints.label} />}
          {activity.config.emotion && activity.phase_key && <EmotionVotePanel activity={activity} phase={activity.phase_key} />}
        </div>
      );
    }
    case "emotions":
      return <EmotionsReviewPanel activity={activity} />;
    case "frictions":
      return <FrictionsPanel activity={activity} />;
    case "improvements":
      return <ImprovementsPanel activity={activity} />;
    case "kpis":
      return <KpisPanel activity={activity} />;
    case "pitch":
      return <PitchPanel activity={activity} />;
  }
}
