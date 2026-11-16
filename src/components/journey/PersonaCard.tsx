"use client";
import { useState } from "react";
import { ChevronDown, Quote, UserRound } from "lucide-react";
import { personaOf, type Persona } from "@/lib/config/personas";
import { getSupabase } from "@/lib/supabase/client";
import { track } from "@/lib/data/save-store";
import type { SessionBundle, Team } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const setTeamPersona = (teamId: string, key: string | null) =>
  track(() => getSupabase().rpc("set_team_persona", { p_team_id: teamId, p_key: key }));

/** Ficha del protousuario (buyer persona). `compact` = una línea para cabeceras. */
export function PersonaCard({ persona, compact, open: openInit = false, className }: { persona: Persona; compact?: boolean; open?: boolean; className?: string }) {
  const [open, setOpen] = useState(openInit);
  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-sky px-2.5 py-1 text-xs font-bold text-navy-900", className)}>
        <UserRound className="h-3.5 w-3.5 text-brand" aria-hidden /> Cliente: {persona.name}
      </span>
    );
  }
  return (
    <section className={cn("print-avoid rounded-2xl border border-brand/20 bg-white p-4 shadow-card", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand">
          <UserRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Vuestro cliente · buyer persona</p>
          <h3 className="text-lg font-extrabold text-navy-900">{persona.name}</h3>
          <p className="text-sm text-muted">{persona.subtitle}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{persona.summary}</p>
      {persona.quote && (
        <p className="mt-3 flex gap-2 rounded-xl bg-canvas px-3 py-2 text-sm italic text-ink/80">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />«{persona.quote}»
        </p>
      )}
      {persona.details.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="no-print mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand">
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} /> {open ? "Ocultar ficha" : "Ver ficha completa"}
          </button>
          <dl className={cn("mt-2 grid gap-2 sm:grid-cols-2", !open && "hidden print:grid")}>
            {persona.details.map((d) => (
              <div key={d.label} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <dt className="text-xs font-bold text-muted">{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

/**
 * Selector del protousuario del equipo: si aún no hay perfil elegido, muestra las opciones;
 * si ya lo hay, la ficha con opción de cambiarlo.
 */
export function TeamPersonaPicker({ bundle, team, canChange }: { bundle: SessionBundle; team: Team; canChange: boolean }) {
  const personas = bundle.session.personas ?? [];
  const current = personaOf(personas, team.persona_key);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!personas.length) return null;

  const takenBy = (key: string) => bundle.teams.filter((t) => t.id !== team.id && t.persona_key === key).length;

  if (current && !choosing) {
    return (
      <div className="space-y-2">
        <PersonaCard persona={current} />
        {canChange && (
          <button type="button" onClick={() => setChoosing(true)} className="cursor-pointer text-sm font-semibold text-muted hover:text-brand">
            Cambiar de perfil
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-dashed border-brand/30 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-extrabold text-navy-900">Elegid el cliente cuyo recorrido vais a analizar</h3>
      <p className="mb-3 text-sm text-muted">Son los protousuarios de la clase anterior. Todo el equipo trabaja sobre el mismo perfil.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {personas.map((p) => (
          <article key={p.key} className={cn("flex flex-col rounded-xl border p-3", team.persona_key === p.key ? "border-brand bg-sky" : "border-line")}>
            <h4 className="font-extrabold text-navy-900">{p.name}</h4>
            <p className="text-xs text-muted">{p.subtitle}</p>
            <p className="mt-2 flex-1 text-sm text-ink/80">{p.summary}</p>
            {takenBy(p.key) > 0 && <p className="mt-2 text-xs text-muted">Ya lo ha elegido {takenBy(p.key) === 1 ? "otro equipo" : `${takenBy(p.key)} equipos`}</p>}
            {canChange && (
              <Button
                size="sm"
                className="mt-3"
                variant={team.persona_key === p.key ? "secondary" : "primary"}
                onClick={async () => {
                  const e = await setTeamPersona(team.id, p.key);
                  setError(e);
                  if (!e) setChoosing(false);
                }}
              >
                {team.persona_key === p.key ? "Elegido ✓" : "Elegir este perfil"}
              </Button>
            )}
          </article>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      {current && (
        <button type="button" onClick={() => setChoosing(false)} className="mt-3 cursor-pointer text-sm font-semibold text-muted hover:text-brand">
          Mantener {current.name}
        </button>
      )}
    </section>
  );
}
