"use client";
import { useEffect, useRef, useState } from "react";
import { Star, Trash2, Pencil, Check, X, Loader2, CloudOff } from "lucide-react";
import type { FieldDef } from "@/lib/config/activities";
import { addContribution, deleteRow, insertContributionId, setContributionSelected, updateContribution } from "@/lib/data/mutations";
import type { Activity, Contribution } from "@/lib/types";
import { useAutosave, type AutosaveStatus } from "@/hooks/use-autosave";
import { Button, Textarea } from "@/components/ui/primitives";
import { useLab } from "./lab-context";
import { cn, initials } from "@/lib/utils";

/**
 * Un campo de la actividad: cada alumno escribe SU respuesta, que se guarda sola
 * mientras escribe; debajo ve en directo las de sus compañeros. Nadie sobrescribe a nadie
 * y el equipo marca con ⭐ las que pasan al mapa final.
 */
export function ContributionField({ activity, field }: { activity: Activity; field: FieldDef }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const items = bundle.work.contributions
    .filter((c) => c.team_id === team.id && c.activity_id === activity.id && c.field_key === field.key)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const inputId = `f-${activity.id}-${field.key}`;

  if (field.type === "choice") return <ChoiceField activity={activity} field={field} items={items} />;

  const own = items.find((c) => c.participant_id === me.id) ?? null;
  const others = items.filter((c) => c.id !== own?.id);

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby={`${inputId}-label`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 id={`${inputId}-label`} className="font-bold text-navy-900">
          {field.label}
        </h3>
        <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-muted" title="Respuestas del equipo">
          {items.length}
        </span>
      </div>

      {writable ? (
        <OwnAnswer activity={activity} field={field} inputId={inputId} own={own} />
      ) : own ? (
        <ul className="mb-2">
          <ContributionCard c={own} mine author={aliasOf(own.participant_id)} writable={false} />
        </ul>
      ) : null}

      {others.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Tu equipo</p>
          <ul className="space-y-2">
            {others.map((c) => (
              <ContributionCard key={c.id} c={c} mine={c.participant_id === me.id} author={aliasOf(c.participant_id)} writable={writable} />
            ))}
          </ul>
        </>
      )}
      {!writable && items.length === 0 && <p className="text-sm italic text-muted">Sin aportaciones.</p>}
    </section>
  );
}

/** La respuesta del propio alumno: se escribe de corrido y se guarda sola. */
function OwnAnswer({ activity, field, inputId, own }: { activity: Activity; field: FieldDef; inputId: string; own: Contribution | null }) {
  const { me } = useLab();
  const [text, setText] = useState(own?.content ?? "");
  const idRef = useRef<string | null>(own?.id ?? null);
  const focused = useRef(false);

  const auto = useAutosave<string>(async (value) => {
    const v = value.trim();
    if (!v) {
      if (!idRef.current) return null;
      const id = idRef.current;
      const err = await deleteRow("contributions", id);
      if (!err) idRef.current = null;
      return err;
    }
    if (idRef.current) return updateContribution(idRef.current, v);
    const r = await insertContributionId(activity, me, field.key, v);
    if (r.id) idRef.current = r.id;
    return r.error;
  });

  // Mantener el id y, si no está editando, el texto que llega de otro dispositivo.
  useEffect(() => {
    if (own?.id) idRef.current = own.id;
    if (own && !focused.current && !auto.dirty && own.content !== text.trim()) setText(own.content);
  }, [own?.id, own?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {field.label}
      </label>
      <Textarea
        id={inputId}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          auto.schedule(e.target.value);
        }}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          void auto.flush();
        }}
        placeholder={field.placeholder ?? "Escribe tu respuesta…"}
        rows={2}
        maxLength={2000}
        className={cn("min-h-[64px]", own?.selected && "border-amber-300 bg-amber-50/40")}
        aria-describedby={`${inputId}-hint`}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <AutosaveHint id={`${inputId}-hint`} status={auto.status} error={auto.error} hasText={text.trim().length > 0} />
        {own && (
          <button
            type="button"
            onClick={() => setContributionSelected(own.id, !own.selected)}
            className={cn("inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold transition", own.selected ? "text-amber-600" : "text-muted hover:text-amber-600")}
            aria-pressed={own.selected}
          >
            <Star className="h-4 w-4" fill={own.selected ? "currentColor" : "none"} />
            {own.selected ? "En el mapa final" : "Llevar al mapa"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AutosaveHint({ id, status, error, hasText }: { id?: string; status: AutosaveStatus; error: string | null; hasText: boolean }) {
  if (status === "error") {
    return (
      <p id={id} role="alert" className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <CloudOff className="h-3.5 w-3.5" /> {error ?? "No se ha podido guardar"} · se reintentará
      </p>
    );
  }
  if (status === "pending" || status === "saving") {
    return (
      <p id={id} className="inline-flex items-center gap-1 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </p>
    );
  }
  if (status === "saved" || hasText) {
    return (
      <p id={id} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" /> Guardado · lo ve tu equipo
      </p>
    );
  }
  return (
    <p id={id} className="text-xs text-muted">
      Se guarda solo mientras escribes.
    </p>
  );
}

function ContributionCard({ c, mine, author, writable }: { c: Contribution; mine: boolean; author: string; writable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.content);
  const [err, setErr] = useState<string | null>(null);

  return (
    <li className={cn("group rounded-xl border px-3 py-2.5 animate-rise", c.selected ? "border-amber-300 bg-amber-50/60" : "border-line bg-canvas/60")}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold", mine ? "bg-brand text-white" : "bg-white text-navy-800 border border-line")} title={author} aria-hidden>
          {initials(author)}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Editar aportación" />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const e = await updateContribution(c.id, text);
                    if (e) setErr(e);
                    else setEditing(false);
                  }}
                >
                  <Check className="h-4 w-4" /> Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setText(c.content))}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              </div>
              {err && <p className="text-xs text-red-700">{err}</p>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{c.content}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            {mine ? "Tú" : author}
            {c.selected && " · ⭐ en el mapa final"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            disabled={!writable}
            onClick={() => setContributionSelected(c.id, !c.selected)}
            className={cn("cursor-pointer rounded-lg p-1.5 transition disabled:cursor-default", c.selected ? "text-amber-500" : "text-muted/60 enabled:hover:bg-white enabled:hover:text-amber-500")}
            aria-pressed={c.selected}
            aria-label={c.selected ? "Quitar del mapa final" : "Llevar al mapa final"}
            title={c.selected ? "Quitar del mapa final" : "Llevar al mapa final"}
          >
            <Star className="h-4.5 w-4.5" fill={c.selected ? "currentColor" : "none"} />
          </button>
          {mine && writable && !editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer rounded-lg p-1.5 text-muted/70 hover:bg-white hover:text-brand" aria-label="Editar mi aportación">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => deleteRow("contributions", c.id)} className="cursor-pointer rounded-lg p-1.5 text-muted/70 hover:bg-white hover:text-red-600" aria-label="Eliminar mi aportación">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** Pregunta de opción: cada alumno marca su opción; se muestra el recuento del equipo. */
function ChoiceField({ activity, field, items }: { activity: Activity; field: FieldDef; items: Contribution[] }) {
  const { me, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const mine = items.find((c) => c.participant_id === me.id);
  const choose = async (opt: string) => {
    if (mine?.content === opt) return deleteRow("contributions", mine.id);
    if (mine) return updateContribution(mine.id, opt);
    return addContribution(activity, me, field.key, opt);
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 font-bold text-navy-900">{field.label}</h3>
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={field.label}>
        {field.options?.map((opt) => {
          const voters = items.filter((c) => c.content === opt);
          const selected = mine?.content === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={!writable}
              onClick={() => choose(opt)}
              aria-pressed={selected}
              className={cn(
                "cursor-pointer rounded-xl border-2 px-3 py-3 text-left transition disabled:cursor-default",
                selected ? "border-brand bg-sky" : "border-line enabled:hover:border-brand-light/50",
              )}
            >
              <span className="block font-semibold text-navy-900">{opt}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {voters.length ? voters.map((v) => aliasOf(v.participant_id)).join(", ") : "Nadie todavía"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
