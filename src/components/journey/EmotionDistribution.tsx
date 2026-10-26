"use client";
import { EMOTIONS } from "@/lib/config/catalogs";
import type { EmotionDistribution as Dist } from "@/lib/domain/journey";
import { cn } from "@/lib/utils";

export function EmotionDistribution({ dist, chosen, onChoose, disabled }: { dist: Dist; chosen?: number | null; onChoose?: (v: number) => void; disabled?: boolean }) {
  const max = Math.max(1, ...dist.counts);
  return (
    <div className="space-y-1.5" aria-label="Distribución de votos del equipo">
      {EMOTIONS.map((e, i) => {
        const n = dist.counts[i];
        const isChosen = chosen === e.value;
        return (
          <div key={e.value} className={cn("flex items-center gap-2 rounded-lg px-1.5 py-1", isChosen && "bg-sky ring-2 ring-brand/30")}>
            <span className="emoji w-7 text-center text-xl" aria-hidden>
              {e.emoji}
            </span>
            <span className="w-24 shrink-0 text-xs font-medium text-muted">{e.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(n / max) * 100}%`, background: e.color }} />
            </div>
            <span className="w-6 text-right text-sm font-bold tabular-nums">{n}</span>
            {onChoose && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChoose(e.value)}
                className={cn(
                  "cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  isChosen ? "bg-navy-900 text-white" : "text-brand hover:bg-sky",
                )}
                aria-pressed={isChosen}
                aria-label={`Elegir ${e.label} como emoción del equipo`}
              >
                {isChosen ? "Del equipo ✓" : "Elegir"}
              </button>
            )}
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted">
        {dist.total} {dist.total === 1 ? "voto" : "votos"}
        {dist.average !== null && ` · media ${dist.average.toFixed(1)}`}
      </p>
    </div>
  );
}
