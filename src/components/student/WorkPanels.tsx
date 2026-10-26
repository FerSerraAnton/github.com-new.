"use client";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { KPI_CATALOG, SEVERITIES } from "@/lib/config/catalogs";
import { PHASES, type PhaseKey } from "@/lib/config/phases";
import { addFriction, addImprovement, addKpi, deleteRow, toggleImprovementVote, upsertSummary } from "@/lib/data/mutations";
import { emotionCurve, rankedImprovements } from "@/lib/domain/journey";
import { firstError, frictionSchema, improvementSchema, kpiSchema } from "@/lib/domain/validation";
import type { Activity } from "@/lib/types";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmotionJourneyChart } from "@/components/journey/EmotionJourneyChart";
import { EmotionVotePanel } from "@/components/journey/EmotionVotePanel";
import { FrictionCard, ImprovementCard, KpiCard } from "@/components/journey/cards";
import { useLab } from "./lab-context";
import { cn } from "@/lib/utils";

function MinCounter({ count, min, noun }: { count: number; min: number; noun: string }) {
  const ok = count >= min;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
      {ok && <CheckCircle2 className="h-4 w-4" />}
      {count} de {min} {noun} mínimo
    </span>
  );
}

function FormCard({ title, children, onSubmit, busy, error, submitLabel }: { title: string; children: ReactNode; onSubmit: () => void; busy: boolean; error: string | null; submitLabel: string }) {
  return (
    <form
      className="rounded-2xl border-2 border-dashed border-brand/25 bg-white p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <h3 className="mb-3 font-extrabold text-navy-900">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy}>
          <Plus className="h-4 w-4" /> {submitLabel}
        </Button>
        {error && (
          <span className="text-sm font-medium text-red-700" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

const PhaseSelect = ({ id, value, onChange }: { id: string; value: string; onChange: (v: PhaseKey) => void }) => (
  <Select id={id} value={value} onChange={(e) => onChange(e.target.value as PhaseKey)}>
    <option value="">Elige una fase…</option>
    {PHASES.map((p) => (
      <option key={p.key} value={p.key}>
        {p.position}. {p.name}
      </option>
    ))}
  </Select>
);

const LevelPicker = ({ value, onChange, label }: { value: string; onChange: (v: "baja" | "media" | "alta") => void; label: string }) => (
  <div role="radiogroup" aria-label={label} className="flex gap-2">
    {SEVERITIES.map((s) => (
      <button
        key={s.value}
        type="button"
        role="radio"
        aria-checked={value === s.value}
        onClick={() => onChange(s.value)}
        className={cn("flex-1 cursor-pointer rounded-xl border-2 px-2 py-2 text-sm font-semibold transition", value === s.value ? "shadow-card" : "border-line")}
        style={value === s.value ? { borderColor: s.color, color: s.color, background: `${s.color}10` } : undefined}
      >
        {s.dot} {s.label}
      </button>
    ))}
  </div>
);

// ------------------------------------------------------------------ FRICCIONES
export function FrictionsPanel({ activity }: { activity: Activity }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const list = bundle.work.frictions.filter((f) => f.team_id === team.id);
  const min = activity.config.minItems ?? 3;
  const empty = { title: "", description: "", phase_key: "" as PhaseKey | "", severity: "media" as "baja" | "media" | "alta", customer_impact: "", business_impact: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const parsed = frictionSchema.safeParse(f);
    const msg = firstError(parsed);
    if (msg || !parsed.success) return setError(msg);
    setBusy(true);
    const err = await addFriction(activity, me, parsed.data);
    setBusy(false);
    if (err) return setError(err);
    setF(empty);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-navy-900">Fricciones del equipo</h3>
        <MinCounter count={list.length} min={min} noun="fricciones" />
      </div>
      {list.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((x) => (
            <FrictionCard key={x.id} f={x} author={aliasOf(x.participant_id)} onDelete={x.participant_id === me.id && writable ? () => deleteRow("frictions", x.id) : undefined} />
          ))}
        </div>
      )}
      {writable && (
        <FormCard title="Nueva fricción" onSubmit={submit} busy={busy} error={error} submitLabel="Añadir fricción">
          <Field label="Título" htmlFor="fr-title">
            <Input id="fr-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} placeholder="Ej.: No entiende las tallas" />
          </Field>
          <Field label="Fase afectada" htmlFor="fr-phase">
            <PhaseSelect id="fr-phase" value={f.phase_key} onChange={(v) => setF({ ...f, phase_key: v })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descripción" htmlFor="fr-desc">
              <Textarea id="fr-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} maxLength={1000} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Nivel de gravedad">
              <LevelPicker value={f.severity} onChange={(v) => setF({ ...f, severity: v })} label="Nivel de gravedad" />
            </Field>
          </div>
          <Field label="Consecuencia para el cliente" htmlFor="fr-cust">
            <Textarea id="fr-cust" value={f.customer_impact} onChange={(e) => setF({ ...f, customer_impact: e.target.value })} rows={2} maxLength={600} placeholder="¿Cómo afecta a su decisión?" />
          </Field>
          <Field label="Consecuencia para la empresa" htmlFor="fr-biz">
            <Textarea id="fr-biz" value={f.business_impact} onChange={(e) => setF({ ...f, business_impact: e.target.value })} rows={2} maxLength={600} placeholder="Ventas perdidas, devoluciones…" />
          </Field>
        </FormCard>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ MEJORAS
export function ImprovementsPanel({ activity }: { activity: Activity }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const frictions = bundle.work.frictions.filter((f) => f.team_id === team.id);
  const ranked = rankedImprovements(bundle.work, team.id);
  const min = activity.config.minItems ?? 3;
  const sessionLive = bundle.session.status === "live";
  const empty = { friction_id: null as string | null, problem: "", solution: "", channel: "", phase_key: "" as PhaseKey | "", benefit: "", priority: "media" as "baja" | "media" | "alta" };
  const [m, setM] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFriction = (id: string) => {
    const fr = frictions.find((x) => x.id === id);
    setM({ ...m, friction_id: fr?.id ?? null, problem: fr ? fr.title : m.problem, phase_key: fr?.phase_key ?? m.phase_key });
  };

  const submit = async () => {
    const parsed = improvementSchema.safeParse(m);
    const msg = firstError(parsed);
    if (msg || !parsed.success) return setError(msg);
    setBusy(true);
    const err = await addImprovement(activity, me, parsed.data);
    setBusy(false);
    if (err) return setError(err);
    setM(empty);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-navy-900">Propuestas del equipo · ordenadas por votos</h3>
        <MinCounter count={ranked.length} min={min} noun="mejoras" />
      </div>
      {ranked.length > 0 && (
        <div className="space-y-3">
          {ranked.map((x, i) => {
            const voted = bundle.work.improvementVotes.some((v) => v.improvement_id === x.id && v.participant_id === me.id);
            return (
              <ImprovementCard
                key={x.id}
                m={x}
                rank={i + 1}
                votes={x.votes}
                voted={voted}
                onVote={sessionLive ? () => toggleImprovementVote(me, x.id, voted) : undefined}
                friction={frictions.find((f) => f.id === x.friction_id) ?? null}
                author={aliasOf(x.participant_id)}
                onDelete={x.participant_id === me.id && writable ? () => deleteRow("improvements", x.id) : undefined}
              />
            );
          })}
        </div>
      )}
      {writable && (
        <FormCard title="Nueva propuesta de mejora" onSubmit={submit} busy={busy} error={error} submitLabel="Añadir propuesta">
          <div className="sm:col-span-2">
            <Field label="Problema que pretende resolver" htmlFor="im-fr" hint={frictions.length ? "Elige una fricción detectada o escribe el problema" : "Aún no hay fricciones: describe el problema"}>
              {frictions.length > 0 && (
                <Select id="im-fr" className="mb-2" value={m.friction_id ?? ""} onChange={(e) => pickFriction(e.target.value)}>
                  <option value="">— Elegir fricción detectada —</option>
                  {frictions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </Select>
              )}
              <Input value={m.problem} onChange={(e) => setM({ ...m, problem: e.target.value })} maxLength={600} aria-label="Problema" placeholder="Problema" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Solución propuesta" htmlFor="im-sol">
              <Textarea id="im-sol" value={m.solution} onChange={(e) => setM({ ...m, solution: e.target.value })} rows={2} maxLength={1000} placeholder="Un cambio concreto en web, tienda o atención" />
            </Field>
          </div>
          <Field label="Canal afectado" htmlFor="im-ch">
            <Input id="im-ch" value={m.channel} onChange={(e) => setM({ ...m, channel: e.target.value })} maxLength={80} placeholder="Web, app, tienda, atención…" />
          </Field>
          <Field label="Fase del Customer Journey" htmlFor="im-ph">
            <PhaseSelect id="im-ph" value={m.phase_key} onChange={(v) => setM({ ...m, phase_key: v })} />
          </Field>
          <Field label="Beneficio esperado" htmlFor="im-ben">
            <Textarea id="im-ben" value={m.benefit} onChange={(e) => setM({ ...m, benefit: e.target.value })} rows={2} maxLength={600} placeholder="Para el cliente y para el negocio" />
          </Field>
          <Field label="Prioridad">
            <LevelPicker value={m.priority} onChange={(v) => setM({ ...m, priority: v })} label="Prioridad" />
          </Field>
        </FormCard>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ KPIs
export function KpisPanel({ activity }: { activity: Activity }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const list = bundle.work.kpis.filter((k) => k.team_id === team.id);
  const improvements = rankedImprovements(bundle.work, team.id);
  const empty = { name: "", is_custom: false, measure_what: "", phase_key: "" as PhaseKey | "", data_source: "", decision: "", improvement_id: null as string | null };
  const [k, setK] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickCatalog = (name: string) => {
    const def = KPI_CATALOG.find((c) => c.name === name);
    setK({ ...k, name, is_custom: false, phase_key: k.phase_key || def?.phases[0] || "", measure_what: k.measure_what || def?.hint || "" });
  };

  const submit = async () => {
    const parsed = kpiSchema.safeParse(k);
    const msg = firstError(parsed);
    if (msg || !parsed.success) return setError(msg);
    setBusy(true);
    const err = await addKpi(activity, me, parsed.data);
    setBusy(false);
    if (err) return setError(err);
    setK(empty);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Los KPIs son <b>propuestas de medición</b> del equipo: no son datos reales de {bundle.session.company} ni resultados obtenidos.
      </Alert>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-navy-900">KPIs del equipo</h3>
        <MinCounter count={list.length} min={activity.config.minItems ?? 1} noun="KPI" />
      </div>
      {list.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((x) => (
            <KpiCard key={x.id} k={x} author={aliasOf(x.participant_id)} improvement={improvements.find((m) => m.id === x.improvement_id) ?? null} onDelete={x.participant_id === me.id && writable ? () => deleteRow("kpis", x.id) : undefined} />
          ))}
        </div>
      )}
      {writable && (
        <FormCard title="Nuevo KPI" onSubmit={submit} busy={busy} error={error} submitLabel="Añadir KPI">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-semibold text-navy-900">Catálogo de indicadores</p>
            <div className="flex flex-wrap gap-1.5">
              {KPI_CATALOG.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => pickCatalog(c.name)}
                  aria-pressed={k.name === c.name && !k.is_custom}
                  title={c.hint}
                  className={cn(
                    "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                    k.name === c.name && !k.is_custom ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand-light",
                  )}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setK({ ...k, name: "", is_custom: true })}
                aria-pressed={k.is_custom}
                className={cn("cursor-pointer rounded-full border border-dashed px-2.5 py-1 text-xs font-semibold", k.is_custom ? "border-brand bg-sky text-brand" : "border-brand/40 text-brand")}
              >
                + Indicador personalizado
              </button>
            </div>
          </div>
          {k.is_custom && (
            <div className="sm:col-span-2">
              <Field label="Nombre del indicador personalizado" htmlFor="kpi-name">
                <Input id="kpi-name" value={k.name} onChange={(e) => setK({ ...k, name: e.target.value })} maxLength={80} placeholder="Ej.: Uso del test de pisada" />
              </Field>
            </div>
          )}
          <Field label="¿Qué queremos medir?" htmlFor="kpi-what">
            <Textarea id="kpi-what" value={k.measure_what} onChange={(e) => setK({ ...k, measure_what: e.target.value })} rows={2} maxLength={600} />
          </Field>
          <Field label="¿En qué fase?" htmlFor="kpi-ph">
            <PhaseSelect id="kpi-ph" value={k.phase_key} onChange={(v) => setK({ ...k, phase_key: v })} />
          </Field>
          <Field label="¿Con qué fuente de datos?" htmlFor="kpi-src">
            <Input id="kpi-src" value={k.data_source} onChange={(e) => setK({ ...k, data_source: e.target.value })} maxLength={300} placeholder="Analítica web, CRM, encuestas, TPV…" />
          </Field>
          <Field label="¿Qué decisión podríamos tomar?" htmlFor="kpi-dec">
            <Input id="kpi-dec" value={k.decision} onChange={(e) => setK({ ...k, decision: e.target.value })} maxLength={600} placeholder="Si baja X, entonces…" />
          </Field>
          {improvements.length > 0 && (
            <div className="sm:col-span-2">
              <Field label="¿Qué mejora prueba? (opcional)" htmlFor="kpi-imp">
                <Select id="kpi-imp" value={k.improvement_id ?? ""} onChange={(e) => setK({ ...k, improvement_id: e.target.value || null })}>
                  <option value="">— Ninguna en concreto —</option>
                  {improvements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.solution.slice(0, 90)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </FormCard>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ MAPA EMOCIONAL
export function EmotionsReviewPanel({ activity }: { activity: Activity }) {
  const { bundle, team } = useLab();
  const curve = emotionCurve(team.id, bundle.work.emotionVotes, bundle.work.emotionSelections);
  const agreed = curve.filter((c) => c.source === "team").length;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-3 shadow-card sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="text-lg font-extrabold text-navy-900">La curva emocional de vuestro cliente</h3>
          <MinCounter count={agreed} min={5} noun="fases acordadas" />
        </div>
        <EmotionJourneyChart points={curve} />
      </section>
      {PHASES.map((p) => (
        <EmotionVotePanel key={p.key} activity={activity} phase={p.key} compact />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ PITCH
export function PitchPanel({ activity }: { activity: Activity }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const remote = bundle.work.summaries.find((s) => s.team_id === team.id);
  const top = rankedImprovements(bundle.work, team.id)[0];
  const blank = { detected: "", detected_phase: "", proposal: "", because: "", measure_with: "", conclusion: "" };
  const [s, setS] = useState(remote ? pick(remote) : blank);
  const [base, setBase] = useState(remote?.updated_at ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  function pick(r: typeof blank) {
    return { detected: r.detected, detected_phase: r.detected_phase, proposal: r.proposal, because: r.because, measure_with: r.measure_with, conclusion: r.conclusion };
  }

  // Si otro compañero guarda mientras no estoy editando, cargar su versión.
  useEffect(() => {
    if (remote && !dirty) {
      setS(pick(remote));
      setBase(remote.updated_at);
    }
  }, [remote?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const conflict = dirty && remote && remote.updated_at !== base && remote.updated_by !== me.id;

  const update = (patch: Partial<typeof blank>) => {
    setS({ ...s, ...patch });
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    const err = await upsertSummary(me, s);
    setBusy(false);
    if (err) return setMsg({ tone: "error", text: err });
    setDirty(false);
    setMsg({ tone: "success", text: "¡Pitch guardado para todo el equipo!" });
  };

  const fill = () => {
    if (!top) return;
    update({
      proposal: s.proposal || top.solution,
      detected: s.detected || top.problem,
      detected_phase: s.detected_phase || top.phase_key,
      measure_with: s.measure_with || bundle.work.kpis.find((k) => k.team_id === team.id && k.improvement_id === top.id)?.name || "",
    });
  };

  const line = "rounded-xl border border-line bg-white px-3 py-2 text-[15px]";
  return (
    <div className="space-y-4">
      {conflict && (
        <Alert tone="warning">
          {aliasOf(remote!.updated_by)} ha guardado otra versión mientras editabas. Si guardas, sustituirás la suya.{" "}
          <button className="cursor-pointer font-bold underline" onClick={() => (setS(pick(remote!)), setBase(remote!.updated_at), setDirty(false))}>
            Cargar su versión
          </button>
        </Alert>
      )}
      <section className="rounded-2xl bg-navy-900 p-5 text-white shadow-lift sm:p-7">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Pitch de 30 segundos</p>
        <div className="space-y-3 text-lg font-semibold leading-relaxed">
          <p className="flex flex-wrap items-center gap-2">
            «Detectamos
            <input className={cn(line, "min-w-[200px] flex-1 text-ink")} value={s.detected} onChange={(e) => update({ detected: e.target.value })} disabled={!writable} aria-label="Qué detectamos" maxLength={600} />
            en la fase
            <select className={cn(line, "text-ink")} value={s.detected_phase} onChange={(e) => update({ detected_phase: e.target.value })} disabled={!writable} aria-label="Fase">
              <option value="">…</option>
              {PHASES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
            .»
          </p>
          <p className="flex flex-wrap items-center gap-2">
            «Proponemos
            <input className={cn(line, "min-w-[200px] flex-1 text-ink")} value={s.proposal} onChange={(e) => update({ proposal: e.target.value })} disabled={!writable} aria-label="Qué proponemos" maxLength={600} />
            porque
            <input className={cn(line, "min-w-[200px] flex-1 text-ink")} value={s.because} onChange={(e) => update({ because: e.target.value })} disabled={!writable} aria-label="Por qué" maxLength={600} />
            .»
          </p>
          <p className="flex flex-wrap items-center gap-2">
            «Lo mediremos con
            <input className={cn(line, "min-w-[200px] flex-1 text-ink")} value={s.measure_with} onChange={(e) => update({ measure_with: e.target.value })} disabled={!writable} aria-label="KPI" maxLength={300} />
            .»
          </p>
        </div>
      </section>
      <Field label="Conclusión del equipo (opcional)" htmlFor="pitch-conc">
        <Textarea id="pitch-conc" value={s.conclusion} onChange={(e) => update({ conclusion: e.target.value })} disabled={!writable} rows={3} maxLength={1500} placeholder="El momento más importante del recorrido es… · El dato que necesitaríamos comprobar es…" />
      </Field>
      {writable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} loading={busy} size="lg">
            Guardar pitch del equipo
          </Button>
          {top && (
            <Button variant="secondary" onClick={fill}>
              Rellenar con la mejora más votada
            </Button>
          )}
          {remote && !dirty && <span className="text-sm text-muted">Última edición: {aliasOf(remote.updated_by)}</span>}
        </div>
      )}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </div>
  );
}
