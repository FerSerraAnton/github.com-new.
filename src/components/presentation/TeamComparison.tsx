"use client";
import { PHASES } from "@/lib/config/phases";
import { EMOTIONS } from "@/lib/config/catalogs";
import { emotionCurve, rankedImprovements } from "@/lib/domain/journey";
import type { SessionBundle } from "@/lib/types";
import { EmotionJourneyChart } from "@/components/journey/EmotionJourneyChart";
import { SeverityBadge } from "@/components/journey/cards";
import { PhaseIcon } from "@/components/ui/brand";

/**
 * Comparativa didáctica entre equipos: curvas emocionales superpuestas,
 * dónde ve cada equipo las fricciones y su propuesta más votada.
 * Sin rankings entre equipos: se compara para analizar, no para competir.
 */
export function TeamComparison({ bundle, large }: { bundle: SessionBundle; large?: boolean }) {
  const { teams, work } = bundle;
  const series = teams.map((t) => ({ name: t.name, color: t.color, points: emotionCurve(t.id, work.emotionVotes, work.emotionSelections) }));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-6">
        <h3 className="mb-1 text-xl font-extrabold text-navy-900">¿Sentimos lo mismo en cada fase?</h3>
        <p className="mb-3 text-sm text-muted">Curvas emocionales de todos los equipos. Fijaos en las fases donde más difieren: ahí hay debate.</p>
        <EmotionJourneyChart series={series} height={large ? 340 : 280} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-white p-4 shadow-card sm:p-6">
        <h3 className="mb-3 text-xl font-extrabold text-navy-900">Emoción y fricciones por fase</h3>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-bold uppercase text-muted">Equipo</th>
              {PHASES.map((p) => (
                <th key={p.key} className="p-2 text-left">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase" style={{ color: p.color }}>
                    <PhaseIcon phase={p.key} className="h-3.5 w-3.5" /> {p.shortName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t, ti) => (
              <tr key={t.id} className="border-t border-line align-top">
                <th scope="row" className="p-2 text-left font-bold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </span>
                </th>
                {PHASES.map((p, pi) => {
                  const pt = series[ti].points[pi];
                  const fr = work.frictions.filter((f) => f.team_id === t.id && f.phase_key === p.key);
                  return (
                    <td key={p.key} className="p-2">
                      <span className="emoji text-2xl" title={pt.value ? EMOTIONS[pt.value - 1].label : "Sin valorar"}>
                        {pt.value ? EMOTIONS[pt.value - 1].emoji : "·"}
                      </span>
                      {fr.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {fr.map((f) => (
                            <li key={f.id} className="text-xs leading-snug">
                              <SeverityBadge level={f.severity} prefix="" /> {f.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-3 text-xl font-extrabold text-navy-900">La propuesta que cada equipo defiende</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => {
            const top = rankedImprovements(work, t.id)[0];
            const tps = work.touchpoints.filter((x) => x.team_id === t.id);
            const summary = work.summaries.find((s) => s.team_id === t.id);
            return (
              <article key={t.id} className="rounded-2xl border border-line bg-white p-5 shadow-card" style={{ borderTop: `5px solid ${t.color}` }}>
                <h4 className="text-lg font-extrabold text-navy-900">{t.name}</h4>
                <p className="mt-0.5 text-xs text-muted">
                  {tps.filter((x) => x.channel_type === "digital").length} contactos digitales · {tps.filter((x) => x.channel_type === "fisico").length} físicos
                </p>
                {top ? (
                  <p className="mt-3 text-[15px] font-semibold leading-snug">💡 {top.solution}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-muted">Todavía sin propuestas.</p>
                )}
                {summary?.measure_with && <p className="mt-2 text-sm text-muted">Lo medirán con: <b className="text-ink">{summary.measure_with}</b></p>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
