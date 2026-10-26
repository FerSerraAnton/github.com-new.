"use client";
import { useEffect, useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useLiveBundle } from "@/hooks/use-live-bundle";
import { useTimer } from "@/hooks/use-timer";
import { PHASES } from "@/lib/config/phases";
import { buildJourneyMatrix, emotionCurve, rankedImprovements } from "@/lib/domain/journey";
import { Spinner, Alert } from "@/components/ui/primitives";
import { BrandMark, PhaseIcon, TimerPill } from "@/components/ui/brand";
import { JourneyHeader, JourneyMap } from "@/components/journey/JourneyMap";
import { EmotionJourneyChart } from "@/components/journey/EmotionJourneyChart";
import { FrictionCard, ImprovementCard } from "@/components/journey/cards";
import { AccessPanel } from "@/components/teacher/TeacherPanels";
import { TeamComparison } from "./TeamComparison";
import { cn, formatDate } from "@/lib/utils";

const VIEWS = [
  { key: "acceso", label: "Acceso" },
  { key: "journey", label: "Customer Journey" },
  { key: "comparativa", label: "Comparativa" },
  { key: "emociones", label: "Mapa emocional" },
  { key: "fricciones", label: "Fricciones" },
  { key: "propuestas", label: "Propuestas más votadas" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

/** Pantalla limpia para el proyector: sin controles administrativos, se actualiza en directo. */
export function PresentationMode({ sessionId }: { sessionId: string }) {
  const { bundle, error } = useLiveBundle({ sessionId });
  const timer = useTimer(bundle?.session ?? null);
  const [view, setView] = useState<ViewKey>("acceso");
  const [teamIdx, setTeamIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const i = VIEWS.findIndex((v) => v.key === view);
      if (e.key === "ArrowRight") setView(VIEWS[(i + 1) % VIEWS.length].key);
      if (e.key === "ArrowLeft") setView(VIEWS[(i - 1 + VIEWS.length) % VIEWS.length].key);
      if (/^[1-9]$/.test(e.key) && bundle && Number(e.key) <= bundle.teams.length) setTeamIdx(Number(e.key) - 1);
      if (e.key.toLowerCase() === "f") void document.documentElement.requestFullscreen?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, bundle]);

  const team = bundle?.teams[Math.min(teamIdx, (bundle?.teams.length ?? 1) - 1)];
  const matrix = useMemo(() => (bundle && team ? buildJourneyMatrix(team, bundle.activities, bundle.work, bundle.participants) : null), [bundle, team]);

  if (!bundle) return error ? <Alert tone="error" className="m-8">{error}</Alert> : <Spinner label="Preparando la proyección…" />;
  const current = bundle.activities.find((a) => a.id === bundle.session.current_activity_id);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="group sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-3">
          <BrandMark compact href="#" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-navy-900">{bundle.session.title}</p>
            {current && <p className="truncate text-sm text-muted">Ahora: {current.title}</p>}
          </div>
          {current && bundle.session.status === "live" && <TimerPill timer={timer} />}
          <nav className="flex flex-wrap gap-1" aria-label="Vistas de proyección">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                aria-current={view === v.key}
                className={cn("cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition", view === v.key ? "bg-navy-900 text-white" : "text-muted hover:bg-sky")}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <button onClick={() => document.documentElement.requestFullscreen?.()} className="cursor-pointer rounded-lg p-2 text-muted hover:bg-sky" aria-label="Pantalla completa (F)">
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {view === "acceso" && (
          <div className="flex min-h-[75vh] flex-col justify-center">
            <p className="mb-6 text-3xl font-extrabold text-navy-900">Únete a la clase desde tu móvil</p>
            <AccessPanel code={bundle.session.code} large />
            <div className="mt-8 flex flex-wrap gap-3">
              {bundle.teams.map((t) => {
                const n = bundle.participants.filter((p) => p.team_id === t.id).length;
                return (
                  <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-lg font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                    {t.name}: {n}/{bundle.session.max_per_team}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {view === "journey" && matrix && (
          <div className="space-y-5">
            <TeamPicker teams={bundle.teams} idx={teamIdx} onPick={setTeamIdx} />
            <JourneyHeader matrix={matrix} company={bundle.session.company} scenario={bundle.session.scenario} date={formatDate(new Date())} />
            <JourneyMap matrix={matrix} projection />
          </div>
        )}

        {view === "comparativa" && <TeamComparison bundle={bundle} large />}

        {view === "emociones" && (
          <div className="grid gap-5 lg:grid-cols-2">
            {bundle.teams.map((t) => (
              <section key={t.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <h3 className="mb-2 flex items-center gap-2 text-xl font-extrabold text-navy-900">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </h3>
                <EmotionJourneyChart points={emotionCurve(t.id, bundle.work.emotionVotes, bundle.work.emotionSelections)} height={240} showLegend={false} />
              </section>
            ))}
          </div>
        )}

        {view === "fricciones" && (
          <div className="grid gap-4 lg:grid-cols-5">
            {PHASES.map((p) => {
              const list = bundle.work.frictions.filter((f) => f.phase_key === p.key);
              return (
                <section key={p.key} className="rounded-2xl p-3" style={{ background: p.tint }}>
                  <h3 className="mb-3 flex items-center gap-2 font-extrabold" style={{ color: p.color }}>
                    <PhaseIcon phase={p.key} className="h-5 w-5" /> {p.name} <span className="ml-auto text-sm">{list.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {list.map((f) => (
                      <div key={f.id}>
                        <p className="mb-0.5 text-[11px] font-bold uppercase text-muted">{bundle.teams.find((t) => t.id === f.team_id)?.name}</p>
                        <FrictionCard f={f} compact />
                      </div>
                    ))}
                    {list.length === 0 && <p className="text-sm italic text-muted">Ninguna fricción detectada aquí.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {view === "propuestas" && (
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {bundle.teams.map((t) => {
              const top = rankedImprovements(bundle.work, t.id).slice(0, 3);
              return (
                <section key={t.id} className="rounded-2xl border border-line bg-white p-5 shadow-card" style={{ borderTop: `5px solid ${t.color}` }}>
                  <h3 className="mb-3 text-xl font-extrabold text-navy-900">{t.name}</h3>
                  <div className="space-y-2">
                    {top.map((m, i) => (
                      <ImprovementCard key={m.id} m={m} votes={m.votes} rank={i + 1} />
                    ))}
                    {top.length === 0 && <p className="italic text-muted">Sin propuestas todavía.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <p className="no-print pb-4 text-center text-xs text-muted">← → cambia de vista · 1–9 elige equipo · F pantalla completa</p>
    </div>
  );
}

function TeamPicker({ teams, idx, onPick }: { teams: { id: string; name: string; color: string }[]; idx: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipo">
      {teams.map((t, i) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={i === idx}
          onClick={() => onPick(i)}
          className={cn("inline-flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-1.5 font-bold transition", i === idx ? "bg-white shadow-card" : "border-transparent text-muted hover:bg-white")}
          style={i === idx ? { borderColor: t.color } : undefined}
        >
          <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}
