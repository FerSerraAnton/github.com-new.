"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown, Footprints, MapPin, HeartPulse, AlertOctagon, Lightbulb, Target, Compass, Smartphone, Store } from "lucide-react";
import { PHASES, PHASE_BY_KEY, type PhaseKey } from "@/lib/config/phases";
import { emotionLabel, type JourneyMatrix, type MapItem, type PhaseColumn } from "@/lib/domain/journey";
import { EmotionJourneyChart } from "./EmotionJourneyChart";
import { FrictionCard, ImprovementCard, KpiCard, SeverityBadge } from "./cards";
import { PhaseIcon } from "@/components/ui/brand";
import { Modal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ROWS: { key: keyof Omit<PhaseColumn, "phase" | "unfiltered">; label: string; Icon: typeof Footprints }[] = [
  { key: "actions", label: "Acciones del cliente", Icon: Footprints },
  { key: "touchpoints", label: "Puntos de contacto", Icon: MapPin },
  { key: "needs", label: "Necesidades y expectativas", Icon: Compass },
  { key: "emotion", label: "Estado emocional", Icon: HeartPulse },
  { key: "frictions", label: "Puntos de fricción", Icon: AlertOctagon },
  { key: "improvements", label: "Oportunidades de mejora", Icon: Lightbulb },
  { key: "kpis", label: "KPIs", Icon: Target },
];

function Items({ items, color }: { items: MapItem[]; color: string }) {
  if (!items.length) return <Empty />;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.id} className="rounded-lg bg-white px-2.5 py-1.5 text-[13px] leading-snug shadow-[0_1px_0_rgb(10_42_82/0.06)]" style={{ borderLeft: `3px solid ${color}` }}>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <span className="text-xs italic text-muted/70">Sin aportaciones</span>;
}

function Cell({ col, row }: { col: PhaseColumn; row: (typeof ROWS)[number]["key"] }) {
  const p = PHASE_BY_KEY[col.phase];
  switch (row) {
    case "actions":
      return <Items items={col.actions} color={p.color} />;
    case "needs":
      return <Items items={col.needs} color={p.color} />;
    case "touchpoints":
      return col.touchpoints.length ? (
        <div className="flex flex-wrap gap-1">
          {col.touchpoints.map((t) => (
            <span key={t.id} title={t.detail || undefined} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-xs font-semibold">
              {t.channelType === "fisico" ? <Store className="h-3 w-3 text-muted" aria-label="Físico" /> : <Smartphone className="h-3 w-3 text-muted" aria-label="Digital" />}
              {t.text}
            </span>
          ))}
        </div>
      ) : (
        <Empty />
      );
    case "emotion": {
      const e = emotionLabel(col.emotion.value);
      return e ? (
        <div className="flex items-center gap-2">
          <span className="emoji text-3xl" aria-hidden>
            {e.emoji}
          </span>
          <span className="text-xs">
            <b style={{ color: e.color }}>{e.label}</b>
            {col.emotion.source === "average" && <span className="block text-muted">provisional · {col.emotion.votes} votos</span>}
            {col.emotion.reason && <span className="mt-0.5 block text-ink/80">{col.emotion.reason}</span>}
          </span>
        </div>
      ) : (
        <Empty />
      );
    }
    case "frictions":
      return col.frictions.length ? (
        <ul className="space-y-1.5">
          {col.frictions.map((f) => (
            <li key={f.id} className="rounded-lg bg-white px-2.5 py-1.5 text-[13px] shadow-[0_1px_0_rgb(10_42_82/0.06)]">
              <SeverityBadge level={f.severity} prefix="" />
              <span className="mt-0.5 block font-semibold leading-snug">{f.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      );
    case "improvements":
      return col.improvements.length ? (
        <ul className="space-y-1.5">
          {col.improvements.map((m) => (
            <li key={m.id} className="rounded-lg bg-white px-2.5 py-1.5 text-[13px] leading-snug shadow-[0_1px_0_rgb(10_42_82/0.06)]">
              {m.solution} <span className="whitespace-nowrap text-xs font-bold text-brand">· 👍 {m.votes}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      );
    case "kpis":
      return col.kpis.length ? (
        <ul className="space-y-1">
          {col.kpis.map((k) => (
            <li key={k.id} className="text-[13px] leading-snug">
              <b>{k.name}</b>
              <span className="block text-xs text-muted">{k.measure_what}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      );
  }
}

export function JourneyHeader({ matrix, company, scenario, date, extra }: { matrix: JourneyMatrix; company: string; scenario: string; date?: string; extra?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Customer Journey · {company}</p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: matrix.team.color }} />
          {matrix.team.name}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink/75">{scenario}</p>
      </div>
      <div className="flex flex-col items-end gap-2 text-right text-sm text-muted">
        {date && <span>{date}</span>}
        {extra}
      </div>
    </header>
  );
}

/** Mapa final: cinco fases en columnas y siete filas, con la curva emocional encima. */
export function JourneyMap({ matrix, projection }: { matrix: JourneyMatrix; projection?: boolean }) {
  const [open, setOpen] = useState<PhaseKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState<PhaseKey | null>("descubrimiento");
  const anyUnfiltered = matrix.columns.some((c) => c.unfiltered);

  return (
    <div className="space-y-5">
      {matrix.context.length > 0 && (
        <section className="print-avoid rounded-2xl border border-line bg-white p-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Punto de partida · la necesidad</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {matrix.context.map((c) => (
              <li key={c.id} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <span className="block text-[11px] font-semibold text-muted">{c.detail}</span>
                {c.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="print-avoid rounded-2xl border border-line bg-white p-3 sm:p-5">
        <EmotionJourneyChart points={matrix.columns.map((c) => c.emotion)} height={projection ? 300 : 250} />
      </section>

      {/* Escritorio / proyección: matriz completa */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white lg:block print:block">
        <table className="w-full min-w-[980px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-[150px] p-3" />
              {PHASES.map((p) => (
                <th key={p.key} className="p-2 align-bottom">
                  <button
                    type="button"
                    onClick={() => setOpen(p.key)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-white transition hover:brightness-110"
                    style={{ background: p.color }}
                    aria-label={`Ver detalle de ${p.name}`}
                  >
                    <PhaseIcon phase={p.key} className="h-4.5 w-4.5" />
                    <span className="text-sm font-extrabold">{p.name}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th scope="row" className="p-3 text-left align-top">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase leading-tight tracking-wide text-navy-800">
                    <r.Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                    {r.label}
                  </span>
                </th>
                {matrix.columns.map((c) => (
                  <td key={c.phase} className="p-2 align-top" style={{ background: `${PHASE_BY_KEY[c.phase].tint}` }}>
                    <Cell col={c} row={r.key} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet: fase a fase */}
      <div className="space-y-2 lg:hidden print:hidden">
        {matrix.columns.map((c) => {
          const p = PHASE_BY_KEY[c.phase];
          const expanded = mobileOpen === c.phase;
          const e = emotionLabel(c.emotion.value);
          return (
            <section key={c.phase} className="overflow-hidden rounded-2xl border border-line bg-white">
              <button
                type="button"
                onClick={() => setMobileOpen(expanded ? null : c.phase)}
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
                style={{ borderLeft: `5px solid ${p.color}` }}
              >
                <PhaseIcon phase={c.phase} className="h-5 w-5" />
                <span className="flex-1 font-bold text-navy-900">
                  {p.position}. {p.name}
                </span>
                {e && <span className="emoji text-2xl">{e.emoji}</span>}
                <ChevronDown className={cn("h-5 w-5 text-muted transition", expanded && "rotate-180")} />
              </button>
              {expanded && (
                <div className="space-y-3 border-t border-line p-4" style={{ background: p.tint }}>
                  {ROWS.map((r) => (
                    <div key={r.key}>
                      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-800">
                        <r.Icon className="h-3.5 w-3.5 text-brand" aria-hidden />
                        {r.label}
                      </h4>
                      <Cell col={c} row={r.key} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {anyUnfiltered && (
        <p className="no-print text-xs text-muted">
          Algunas celdas muestran todas las aportaciones porque el equipo aún no ha marcado con ⭐ las que van al mapa final.
        </p>
      )}

      <PhaseDetail matrix={matrix} phase={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Detalle completo de una fase (JourneyPhaseCard). */
export function PhaseDetail({ matrix, phase, onClose }: { matrix: JourneyMatrix; phase: PhaseKey | null; onClose: () => void }) {
  const col = matrix.columns.find((c) => c.phase === phase);
  if (!phase || !col) return null;
  const p = PHASE_BY_KEY[phase];
  const e = emotionLabel(col.emotion.value);
  return (
    <Modal open onClose={onClose} wide title={<span style={{ color: p.color }}>{p.position}. {p.name}</span>}>
      <div className="grid gap-5 md:grid-cols-2">
        <Block title="Acciones del cliente">
          <ListWithAuthors items={col.actions} />
        </Block>
        <Block title="Necesidades y expectativas">
          <ListWithAuthors items={col.needs} />
        </Block>
        <Block title="Puntos de contacto">
          {col.touchpoints.length ? (
            <ul className="space-y-1.5 text-sm">
              {col.touchpoints.map((t) => (
                <li key={t.id}>
                  <b>{t.text}</b> <span className="text-xs text-muted">({t.channelType === "fisico" ? "físico" : "digital"} · {t.author})</span>
                  {t.detail && <span className="block text-ink/80">{t.detail}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Block>
        <Block title="Estado emocional">
          {e ? (
            <p className="flex items-center gap-3 text-sm">
              <span className="emoji text-4xl">{e.emoji}</span>
              <span>
                <b>{e.label}</b>
                {col.emotion.source === "average" && " (provisional)"}
                {col.emotion.reason && <span className="block">{col.emotion.reason}</span>}
              </span>
            </p>
          ) : (
            <Empty />
          )}
        </Block>
        <Block title="Puntos de fricción">
          <div className="space-y-2">{col.frictions.length ? col.frictions.map((f) => <FrictionCard key={f.id} f={f} compact />) : <Empty />}</div>
        </Block>
        <Block title="Oportunidades de mejora">
          <div className="space-y-2">{col.improvements.length ? col.improvements.map((m) => <ImprovementCard key={m.id} m={m} votes={m.votes} compact />) : <Empty />}</div>
        </Block>
        <Block title="KPIs">
          <div className="space-y-2">{col.kpis.length ? col.kpis.map((k) => <KpiCard key={k.id} k={k} />) : <Empty />}</div>
        </Block>
      </div>
    </Modal>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ListWithAuthors({ items }: { items: MapItem[] }) {
  if (!items.length) return <Empty />;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.id} className="rounded-lg bg-canvas px-3 py-2">
          {i.text}
          <span className="block text-[11px] text-muted">
            {i.detail} · {i.author}
          </span>
        </li>
      ))}
    </ul>
  );
}
