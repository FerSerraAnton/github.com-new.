"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock, Hourglass, Lock, Map as MapIcon, PenSquare, Users, GitCompareArrows } from "lucide-react";
import { buildJourneyMatrix, teamProgress } from "@/lib/domain/journey";
import type { Activity, SessionBundle } from "@/lib/types";
import { useTimer } from "@/hooks/use-timer";
import { usePresence } from "@/hooks/use-presence";
import type { Connection } from "@/hooks/use-live-bundle";
import { BrandMark, ConnectionDot, DemoBadge, OfflineBanner, SaveStatus, TimerPill } from "@/components/ui/brand";
import { Card, ProgressBar, Tabs } from "@/components/ui/primitives";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { JourneyHeader, JourneyMap } from "@/components/journey/JourneyMap";
import { JourneyExport } from "@/components/journey/JourneyExport";
import { TeamComparison } from "@/components/presentation/TeamComparison";
import { ActivityWorkspace } from "./ActivityWorkspace";
import { LabProvider, type LabCtx } from "./lab-context";
import { cn, formatDate, initials } from "@/lib/utils";

type View = "actividad" | "mapa" | "comparar";

export function StudentDashboard({ bundle, userId, connection }: { bundle: SessionBundle; userId: string; connection: Connection }) {
  const { session, activities, participants, teams, work } = bundle;
  const me = participants.find((p) => p.user_id === userId)!;
  const team = teams.find((t) => t.id === me.team_id)!;
  const timer = useTimer(session);
  const online = usePresence(session.id, { role: "student", participant_id: me.id, team_id: me.team_id });
  const [view, setView] = useState<View>("actividad");
  const current = activities.find((a) => a.id === session.current_activity_id) ?? null;
  const visible = activities.filter((a) => a.status !== "pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Al cambiar la actividad actual (el profesor avanza), saltar a ella automáticamente.
  useEffect(() => {
    setSelectedId(session.current_activity_id);
    setView("actividad");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [session.current_activity_id]);

  const selected = activities.find((a) => a.id === selectedId) ?? current;
  const progress = teamProgress(activities, work, team.id);
  const matrix = useMemo(() => buildJourneyMatrix(team, activities, work, participants), [team, activities, work, participants]);
  const mates = participants.filter((p) => p.team_id === team.id);
  const next = current ? activities.find((a) => a.position === current.position + 1) : null;
  const currentDone = current ? work.states.some((s) => s.team_id === team.id && s.activity_id === current.id && s.status === "done") : false;

  const ctx: LabCtx = {
    bundle,
    me,
    team,
    online,
    canWrite: (a: Activity) =>
      session.status === "live" && a.status === "active" && !(session.auto_lock_on_timeout && timer.expired && a.id === session.current_activity_id),
    aliasOf: (pid) => participants.find((p) => p.id === pid)?.alias ?? "Alguien",
  };

  return (
    <LabProvider value={ctx}>
      <OfflineBanner connection={connection} />
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <BrandMark compact href="#" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-navy-900">{session.title}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: team.color }} />
              {team.name} · {session.company}
            </p>
          </div>
          <div className="hidden w-40 sm:block" title={`${progress.done} de ${progress.total} actividades terminadas`}>
            <p className="mb-1 text-right text-xs font-bold text-navy-900">{progress.percent}% completado</p>
            <ProgressBar value={progress.percent} color={team.color} />
          </div>
          <ConnectionDot connection={connection} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-40 pt-5">
        {session.is_demo && (
          <div className="mb-4">
            <DemoBadge />
          </div>
        )}

        {/* Compañeros */}
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Compañeros de equipo">
          <Users className="h-4 w-4 text-muted" aria-hidden />
          {mates.map((m) => (
            <span key={m.id} className={cn("inline-flex items-center gap-1.5 rounded-full border bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-semibold", m.id === me.id ? "border-brand/40" : "border-line")}>
              <span className="relative grid h-6 w-6 place-items-center rounded-full bg-sky text-[10px] font-bold text-navy-900">
                {initials(m.alias)}
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", online.has(m.id) ? "bg-emerald-500" : "bg-line")} aria-label={online.has(m.id) ? "conectado" : "desconectado"} />
              </span>
              {m.id === me.id ? `${m.alias} (tú)` : m.alias}
            </span>
          ))}
          <span className="ml-auto">
            <Tabs<View>
              value={view}
              onChange={setView}
              items={[
                { value: "actividad", label: <><PenSquare className="h-4 w-4" /> Actividad</> },
                { value: "mapa", label: <><MapIcon className="h-4 w-4" /> Mapa del equipo</> },
                ...(session.comparison_enabled ? [{ value: "comparar" as View, label: <><GitCompareArrows className="h-4 w-4" /> Comparar</> }] : []),
              ]}
            />
          </span>
        </div>

        {view === "mapa" && (
          <div className="space-y-5">
            <Card className="p-5">
              <JourneyHeader matrix={matrix} company={session.company} scenario={session.scenario} date={formatDate(new Date())} extra={<JourneyExport bundle={bundle} teamId={team.id} compact />} />
            </Card>
            <JourneyMap matrix={matrix} />
          </div>
        )}

        {view === "comparar" && session.comparison_enabled && <TeamComparison bundle={bundle} />}

        {view === "actividad" && (
          <>
            {session.status === "draft" || !current ? (
              <WaitingRoom title="La clase aún no ha empezado" text={`Ya estás en ${team.name}. En cuanto el profesor pulse «Iniciar clase», aquí aparecerá la primera actividad.`} />
            ) : session.status === "finished" ? (
              <WaitingRoom
                title="¡Clase terminada! 🎉"
                text="Gracias por participar. Podéis consultar y descargar el Customer Journey de vuestro equipo en «Mapa del equipo»."
                icon={<Check className="h-8 w-8" />}
              />
            ) : (
              <>
                <ActivityStepper activities={visible} selectedId={selected?.id ?? null} currentId={current.id} onSelect={setSelectedId} />
                {selected && <ActivityWorkspace key={selected.id} activity={selected} timer={timer} isCurrent={selected.id === current.id} />}
                {selected?.id === current.id && currentDone && (
                  <div className="mt-5">
                    <WaitingRoom title="¡Buen trabajo! Esperad a que el profesor active la siguiente actividad." text={next ? `Próxima actividad: ${next.title}.` : "Era la última actividad. ¡Enhorabuena!"} compact />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Zona inferior: journey resumido, guardado y siguiente actividad */}
      <footer className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="hidden md:block">
            <JourneyTimeline matrix={matrix} current={selected?.phase_key ?? null} onSelect={() => setView("mapa")} />
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
            <SaveStatus connection={connection} />
            <span className="flex items-center gap-3">
              {current && session.status === "live" && <TimerPill timer={timer} />}
              <span className="hidden items-center gap-1 text-muted sm:inline-flex">
                {next ? (
                  <>
                    Siguiente: <b className="text-navy-900">{next.title}</b> <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : current ? (
                  "Última actividad"
                ) : null}
              </span>
            </span>
          </div>
        </div>
      </footer>
    </LabProvider>
  );
}

function ActivityStepper({ activities, selectedId, currentId, onSelect }: { activities: Activity[]; selectedId: string | null; currentId: string; onSelect: (id: string) => void }) {
  if (activities.length <= 1) return null;
  return (
    <nav aria-label="Actividades desbloqueadas" className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
      {activities.map((a) => {
        const isSel = a.id === selectedId;
        const Icon = a.status === "completed" ? Check : a.status === "locked" ? Lock : a.id === currentId ? Clock : Hourglass;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            aria-current={isSel ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              isSel ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-muted hover:text-navy-900",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {a.position}. {a.title}
            {a.id === currentId && !isSel && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="actual" />}
          </button>
        );
      })}
    </nav>
  );
}

function WaitingRoom({ title, text, icon, compact }: { title: string; text: string; icon?: React.ReactNode; compact?: boolean }) {
  return (
    <section className={cn("flex flex-col items-center rounded-2xl border border-line bg-white text-center shadow-card animate-rise", compact ? "px-6 py-6" : "px-6 py-16")}>
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-sky text-brand">{icon ?? <Hourglass className="h-7 w-7" />}</span>
      <h2 className="max-w-xl text-xl font-extrabold text-navy-900 sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-lg text-muted">{text}</p>
    </section>
  );
}
