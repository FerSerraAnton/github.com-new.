"use client";
import { ThumbsUp, Trash2, Target, Database, Lightbulb } from "lucide-react";
import { SEVERITIES } from "@/lib/config/catalogs";
import type { Friction, Improvement, Kpi } from "@/lib/types";
import { PhaseChip } from "@/components/ui/brand";
import { cn } from "@/lib/utils";

export function SeverityBadge({ level, prefix = "Gravedad" }: { level: Friction["severity"]; prefix?: string }) {
  const s = SEVERITIES.find((x) => x.value === level)!;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: `${s.color}55`, color: s.color, background: `${s.color}10` }}>
      <span aria-hidden>{s.dot}</span>
      {prefix} {s.label.toLowerCase()}
    </span>
  );
}

export function FrictionCard({ f, author, onDelete, compact }: { f: Friction; author?: string; onDelete?: () => void; compact?: boolean }) {
  const s = SEVERITIES.find((x) => x.value === f.severity)!;
  return (
    <article className="print-avoid relative rounded-xl border border-line bg-white p-3.5 animate-rise" style={{ borderLeft: `4px solid ${s.color}` }}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {!compact && <PhaseChip phase={f.phase_key} />}
        <SeverityBadge level={f.severity} />
      </div>
      <h4 className="font-bold leading-snug text-navy-900">{f.title}</h4>
      {f.description && <p className="mt-1 text-sm text-ink/80">{f.description}</p>}
      {!compact && (f.customer_impact || f.business_impact) && (
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-canvas p-2">
            <dt className="font-semibold text-muted">Para el cliente</dt>
            <dd>{f.customer_impact || "—"}</dd>
          </div>
          <div className="rounded-lg bg-canvas p-2">
            <dt className="font-semibold text-muted">Para la empresa</dt>
            <dd>{f.business_impact || "—"}</dd>
          </div>
        </dl>
      )}
      <Footer author={author} onDelete={onDelete} />
    </article>
  );
}

export function ImprovementCard({
  m, votes, voted, onVote, author, onDelete, friction, compact, rank,
}: {
  m: Improvement; votes: number; voted?: boolean; onVote?: () => void; author?: string; onDelete?: () => void; friction?: Friction | null; compact?: boolean; rank?: number;
}) {
  return (
    <article className="print-avoid rounded-xl border border-line bg-white p-3.5 animate-rise">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {rank !== undefined && <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white">#{rank}</span>}
            {!compact && <PhaseChip phase={m.phase_key} />}
            <SeverityBadge level={m.priority} prefix="Prioridad" />
            {m.channel && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">{m.channel}</span>}
          </div>
          <h4 className="flex gap-1.5 font-bold leading-snug text-navy-900">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            {m.solution}
          </h4>
          {!compact && (
            <dl className="mt-2 space-y-1 text-sm">
              <div>
                <dt className="inline font-semibold text-muted">Problema: </dt>
                <dd className="inline">{friction ? `${friction.title} — ` : ""}{m.problem}</dd>
              </div>
              {m.benefit && (
                <div>
                  <dt className="inline font-semibold text-muted">Beneficio esperado: </dt>
                  <dd className="inline">{m.benefit}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <button
          type="button"
          onClick={onVote}
          disabled={!onVote}
          aria-pressed={voted}
          aria-label={voted ? `Quitar mi voto (${votes} votos)` : `Votar esta propuesta (${votes} votos)`}
          className={cn(
            "flex shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2 text-sm font-bold transition disabled:cursor-default",
            voted ? "border-brand bg-brand text-white" : "border-line bg-white text-navy-900 enabled:hover:border-brand-light",
          )}
        >
          <ThumbsUp className={cn("h-4 w-4", voted && "animate-pop")} aria-hidden />
          <span className="tabular-nums">{votes}</span>
        </button>
      </div>
      <Footer author={author} onDelete={onDelete} />
    </article>
  );
}

export function KpiCard({ k, author, onDelete, improvement, compact }: { k: Kpi; author?: string; onDelete?: () => void; improvement?: Improvement | null; compact?: boolean }) {
  return (
    <article className="print-avoid rounded-xl border border-line bg-white p-3.5 animate-rise">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {!compact && <PhaseChip phase={k.phase_key} />}
        <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-bold text-brand">{k.is_custom ? "KPI personalizado" : "KPI"}</span>
      </div>
      <h4 className="flex items-center gap-1.5 font-bold text-navy-900">
        <Target className="h-4 w-4 text-brand" aria-hidden />
        {k.name}
      </h4>
      <p className="mt-1 text-sm">{k.measure_what}</p>
      {!compact && (
        <dl className="mt-2 space-y-1 text-xs text-ink/80">
          {k.data_source && (
            <div className="flex gap-1.5">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              <span>
                <b className="text-muted">Fuente:</b> {k.data_source}
              </span>
            </div>
          )}
          {k.decision && (
            <div>
              <b className="text-muted">Decisión:</b> {k.decision}
            </div>
          )}
          {improvement && (
            <div>
              <b className="text-muted">Mide la mejora:</b> {improvement.solution}
            </div>
          )}
        </dl>
      )}
      <Footer author={author} onDelete={onDelete} />
    </article>
  );
}

function Footer({ author, onDelete }: { author?: string; onDelete?: () => void }) {
  if (!author && !onDelete) return null;
  return (
    <div className="mt-2 flex items-center justify-between text-xs text-muted">
      <span>{author ? `Propuesto por ${author}` : ""}</span>
      {onDelete && (
        <button type="button" onClick={onDelete} className="no-print inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar mi aportación">
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      )}
    </div>
  );
}
