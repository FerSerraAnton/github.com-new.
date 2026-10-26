"use client";
import { PHASE_BY_KEY, isPhaseKey } from "@/lib/config/phases";
import { buildJourneyMatrix, rankedImprovements } from "@/lib/domain/journey";
import type { SessionBundle, Team } from "@/lib/types";
import { JourneyHeader, JourneyMap } from "./JourneyMap";
import { FrictionCard, ImprovementCard, KpiCard } from "./cards";
import { DemoBadge } from "@/components/ui/brand";
import { formatDate } from "@/lib/utils";

/** Documento completo de un equipo: el que se imprime / guarda como PDF o se comparte en solo lectura. */
export function JourneyDocument({ bundle, team, hideAuthors }: { bundle: SessionBundle; team: Team; hideAuthors?: boolean }) {
  const { session, activities, participants, work } = bundle;
  const matrix = buildJourneyMatrix(team, activities, work, participants);
  const alias = (id: string) => (hideAuthors ? undefined : participants.find((p) => p.id === id)?.alias);
  const frictions = work.frictions.filter((f) => f.team_id === team.id);
  const improvements = rankedImprovements(work, team.id);
  const kpis = work.kpis.filter((k) => k.team_id === team.id);
  const pitch = work.summaries.find((s) => s.team_id === team.id);
  const members = participants.filter((p) => p.team_id === team.id);

  return (
    <article className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-5">
        <JourneyHeader
          matrix={matrix}
          company={session.company}
          scenario={session.scenario}
          date={formatDate(new Date())}
          extra={
            <>
              {session.is_demo && <DemoBadge />}
              <span className="text-xs">{session.title}</span>
              {!hideAuthors && members.length > 0 && <span className="text-xs">Equipo: {members.map((m) => m.alias).join(", ")}</span>}
            </>
          }
        />
      </div>

      <JourneyMap matrix={matrix} />

      {pitch && (pitch.proposal || pitch.detected) && (
        <section className="print-avoid rounded-2xl bg-navy-900 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Conclusión del equipo</p>
          <p className="mt-2 text-lg font-semibold leading-relaxed">
            Detectamos {pitch.detected || "…"} en la fase {isPhaseKey(pitch.detected_phase) ? PHASE_BY_KEY[pitch.detected_phase].name : pitch.detected_phase || "…"}. Proponemos {pitch.proposal || "…"} porque{" "}
            {pitch.because || "…"}. Lo mediremos con {pitch.measure_with || "…"}.
          </p>
          {pitch.conclusion && <p className="mt-2 text-white/80">{pitch.conclusion}</p>}
        </section>
      )}

      <section className="print-break space-y-3">
        <h3 className="text-xl font-extrabold text-navy-900">Puntos de fricción ({frictions.length})</h3>
        <div className="grid gap-3 md:grid-cols-2">{frictions.map((f) => <FrictionCard key={f.id} f={f} author={alias(f.participant_id)} />)}</div>
      </section>
      <section className="space-y-3">
        <h3 className="text-xl font-extrabold text-navy-900">Propuestas de mejora · por votos ({improvements.length})</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {improvements.map((m, i) => (
            <ImprovementCard key={m.id} m={m} votes={m.votes} rank={i + 1} author={alias(m.participant_id)} friction={frictions.find((f) => f.id === m.friction_id) ?? null} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-xl font-extrabold text-navy-900">KPIs propuestos ({kpis.length})</h3>
        <p className="text-sm text-muted">Propuestas de medición del equipo; no son datos reales de {session.company}.</p>
        <div className="grid gap-3 md:grid-cols-2">{kpis.map((k) => <KpiCard key={k.id} k={k} author={alias(k.participant_id)} improvement={improvements.find((m) => m.id === k.improvement_id) ?? null} />)}</div>
      </section>
    </article>
  );
}
