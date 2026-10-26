"use client";
import { EMOTIONS } from "@/lib/config/catalogs";
import { PHASES, PHASE_BY_KEY } from "@/lib/config/phases";
import type { EmotionPoint } from "@/lib/domain/journey";

/**
 * Gráfico de evolución emocional: fases en el eje X, intensidad 1–5 en el eje Y,
 * cada punto con su emoji. Los puntos "provisionales" (media de votos sin acuerdo
 * del equipo) se dibujan con trazo discontinuo.
 */
export function EmotionJourneyChart({
  points,
  height = 260,
  title = "Mapa emocional del cliente",
  showLegend = true,
  series,
}: {
  points?: EmotionPoint[];
  height?: number;
  title?: string;
  showLegend?: boolean;
  /** Varias curvas superpuestas (comparativa entre equipos) */
  series?: { name: string; color: string; points: EmotionPoint[] }[];
}) {
  const W = 760;
  const H = height;
  const padL = 44;
  const padR = 24;
  const padT = 24;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (plotW * (i + 0.5)) / PHASES.length;
  const y = (v: number) => padT + plotH - ((v - 1) / 4) * plotH;
  const all = series ?? (points ? [{ name: "Equipo", color: "#0A2A52", points }] : []);
  const multi = all.length > 1;

  const segments = (pts: EmotionPoint[]) => {
    const out: { d: string; dashed: boolean }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (a.value === null || b.value === null) continue;
      out.push({ d: `M${x(i)},${y(a.value)} L${x(i + 1)},${y(b.value)}`, dashed: a.source !== "team" || b.source !== "team" });
    }
    return out;
  };

  const described = all
    .map((s) => `${s.name}: ${s.points.map((p) => `${PHASE_BY_KEY[p.phase].name} ${p.value ? EMOTIONS[p.value - 1].label : "sin valorar"}`).join(", ")}`)
    .join(". ");

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${described}`}>
        {/* bandas positiva / negativa */}
        <rect x={padL} y={padT} width={plotW} height={y(3) - padT} fill="#12946B" opacity={0.05} />
        <rect x={padL} y={y(3)} width={plotW} height={padT + plotH - y(3)} fill="#D23A3A" opacity={0.05} />
        {EMOTIONS.map((e) => (
          <g key={e.value}>
            <line x1={padL} x2={W - padR} y1={y(e.value)} y2={y(e.value)} stroke="#DFE5EE" strokeDasharray={e.value === 3 ? undefined : "3 5"} />
            <text x={padL - 10} y={y(e.value) + 6} textAnchor="end" fontSize={16} className="emoji">
              {e.emoji}
            </text>
          </g>
        ))}
        {PHASES.map((p, i) => (
          <g key={p.key}>
            <line x1={x(i)} x2={x(i)} y1={padT} y2={padT + plotH} stroke="#EEF1F6" />
            <circle cx={x(i)} cy={H - padB + 16} r={4} fill={p.color} />
            <text x={x(i)} y={H - padB + 36} textAnchor="middle" fontSize={13} fontWeight={700} fill="#13233A">
              {p.shortName}
            </text>
          </g>
        ))}
        {all.map((s, si) => (
          <g key={s.name}>
            {segments(s.points).map((seg, k) => (
              <path key={k} d={seg.d} stroke={s.color} strokeWidth={multi ? 3 : 4} strokeLinecap="round" fill="none" strokeDasharray={seg.dashed ? "2 8" : undefined} opacity={multi ? 0.85 : 1} />
            ))}
            {s.points.map((pt, i) =>
              pt.value === null ? (
                !multi && (
                  <text key={pt.phase} x={x(i)} y={y(3) + 5} textAnchor="middle" fontSize={13} fill="#8A94A6">
                    ?
                  </text>
                )
              ) : (
                <g key={pt.phase}>
                  <title>{`${s.name} · ${PHASE_BY_KEY[pt.phase].name}: ${EMOTIONS[pt.value - 1].label}${pt.source === "average" ? " (provisional: media de votos)" : ""}${pt.reason ? ` — ${pt.reason}` : ""}`}</title>
                  {multi ? (
                    <circle cx={x(i) + (si - (all.length - 1) / 2) * 7} cy={y(pt.value)} r={7} fill={s.color} stroke="white" strokeWidth={2} />
                  ) : (
                    <>
                      <circle cx={x(i)} cy={y(pt.value)} r={21} fill="white" stroke={EMOTIONS[pt.value - 1].color} strokeWidth={3} strokeDasharray={pt.source === "team" ? undefined : "4 3"} />
                      <text x={x(i)} y={y(pt.value) + 9} textAnchor="middle" fontSize={25} className="emoji">
                        {EMOTIONS[pt.value - 1].emoji}
                      </text>
                    </>
                  )}
                </g>
              ),
            )}
          </g>
        ))}
      </svg>
      {showLegend && (
        <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {multi ? (
            all.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))
          ) : (
            <>
              <span>Línea continua: emoción acordada por el equipo</span>
              <span>Línea punteada: media provisional de votos</span>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
