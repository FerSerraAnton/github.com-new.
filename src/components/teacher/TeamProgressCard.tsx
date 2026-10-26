"use client";
import { Eye, MessageSquareText, AlertOctagon, Lightbulb, Users } from "lucide-react";
import { EMOTIONS } from "@/lib/config/catalogs";
import { contributionCount, emotionCurve, isTeamDone, teamProgress } from "@/lib/domain/journey";
import type { SessionBundle, Team } from "@/lib/types";
import { Button, ProgressBar } from "@/components/ui/primitives";

export function TeamProgressCard({ bundle, team, online, onOpen }: { bundle: SessionBundle; team: Team; online: Set<string>; onOpen: () => void }) {
  const { session, activities, participants, work } = bundle;
  const members = participants.filter((p) => p.team_id === team.id);
  const connected = members.filter((m) => online.has(m.id) || m.is_demo).length;
  const progress = teamProgress(activities, work, team.id);
  const current = activities.find((a) => a.id === session.current_activity_id);
  const done = current ? isTeamDone(work, team.id, current.id) : false;
  const curve = emotionCurve(team.id, work.emotionVotes, work.emotionSelections);
  const frictions = work.frictions.filter((f) => f.team_id === team.id).length;
  const improvements = work.improvements.filter((m) => m.team_id === team.id).length;
  const answers = contributionCount(work, team.id);

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-card transition hover:shadow-lift animate-rise" style={{ borderTop: `5px solid ${team.color}` }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-extrabold uppercase tracking-wide text-navy-900">{team.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${done ? "bg-emerald-50 text-emerald-700" : session.status === "live" ? "bg-amber-50 text-amber-800" : "bg-canvas text-muted"}`}>
          {done ? "Terminado ✓" : session.status === "live" ? "Trabajando" : session.status === "finished" ? "Finalizado" : "En espera"}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <Users className="h-4 w-4" /> {members.length} participantes · <span className="text-emerald-700">{connected} conectados</span>
      </p>
      {current && (
        <p className="mt-1 text-sm">
          Actividad actual: <b>{current.title}</b>
        </p>
      )}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs font-semibold">
          <span>Progreso</span>
          <span>{progress.percent} %</span>
        </div>
        <ProgressBar value={progress.percent} color={team.color} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-1 rounded-xl bg-canvas px-2 py-1.5" aria-label="Valoraciones emocionales por fase">
        {curve.map((c) => (
          <span key={c.phase} className="emoji text-xl" title={c.value ? `${EMOTIONS[c.value - 1].label}${c.source === "average" ? " (provisional)" : ""}` : "Sin valorar"} style={{ opacity: c.source === "team" ? 1 : c.value ? 0.55 : 0.25 }}>
            {c.value ? EMOTIONS[c.value - 1].emoji : "·"}
          </span>
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-line py-1.5">
          <dt className="flex items-center justify-center gap-1 text-muted"><MessageSquareText className="h-3.5 w-3.5" /> Respuestas</dt>
          <dd className="text-lg font-extrabold text-navy-900">{answers}</dd>
        </div>
        <div className="rounded-lg border border-line py-1.5">
          <dt className="flex items-center justify-center gap-1 text-muted"><AlertOctagon className="h-3.5 w-3.5" /> Fricciones</dt>
          <dd className="text-lg font-extrabold text-navy-900">{frictions}</dd>
        </div>
        <div className="rounded-lg border border-line py-1.5">
          <dt className="flex items-center justify-center gap-1 text-muted"><Lightbulb className="h-3.5 w-3.5" /> Mejoras</dt>
          <dd className="text-lg font-extrabold text-navy-900">{improvements}</dd>
        </div>
      </dl>
      <Button variant="secondary" className="mt-4 w-full" onClick={onOpen}>
        <Eye className="h-4 w-4" /> VER RESPUESTAS
      </Button>
    </article>
  );
}
