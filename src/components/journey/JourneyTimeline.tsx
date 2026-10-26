"use client";
import { PHASES, type PhaseKey } from "@/lib/config/phases";
import { emotionLabel, type JourneyMatrix } from "@/lib/domain/journey";
import { PhaseIcon } from "@/components/ui/brand";
import { cn } from "@/lib/utils";

/**
 * Tira horizontal conectada con las cinco fases: transmite la idea de viaje.
 * En móvil se desplaza horizontalmente sin estrecharse.
 */
export function JourneyTimeline({ matrix, current, onSelect }: { matrix?: JourneyMatrix | null; current?: PhaseKey | null; onSelect?: (p: PhaseKey) => void }) {
  return (
    <ol className="flex snap-x gap-0 overflow-x-auto pb-1" aria-label="Fases del Customer Journey">
      {PHASES.map((p, i) => {
        const col = matrix?.columns[i];
        const count = col ? col.actions.length + col.needs.length + col.touchpoints.length : 0;
        const emo = col ? emotionLabel(col.emotion.value) : null;
        const active = current === p.key;
        const Tag = onSelect ? "button" : "div";
        return (
          <li key={p.key} className="flex min-w-[148px] flex-1 snap-start items-center">
            <Tag
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(p.key) } : {})}
              className={cn(
                "group relative flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left transition",
                active ? "shadow-lift" : "border-line",
                onSelect && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card",
              )}
              style={active ? { borderColor: p.color, boxShadow: `0 0 0 3px ${p.color}22` } : undefined}
              aria-current={active ? "step" : undefined}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: p.color }}>
                <PhaseIcon phase={p.key} className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: p.color }}>
                  Fase {p.position}
                </span>
                <span className="block truncate text-sm font-bold text-navy-900">{p.shortName}</span>
                {matrix && (
                  <span className="block text-[11px] text-muted">
                    {count} {count === 1 ? "aportación" : "aportaciones"}
                  </span>
                )}
              </span>
              {emo && (
                <span className="emoji ml-auto text-2xl" title={emo.label} aria-label={`Emoción: ${emo.label}`}>
                  {emo.emoji}
                </span>
              )}
            </Tag>
            {i < PHASES.length - 1 && <span className="journey-path mx-1 h-2 w-5 shrink-0" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
