"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, ExternalLink, Link2, Lock, Pencil, Play, Plus, Trash2, Unlock, UserMinus } from "lucide-react";
import type { ActivityConfig } from "@/lib/config/activities";
import { addTeam, deleteTeam, moveParticipant, removeParticipant, renameTeam, setActivityStatus, updateActivity, updateSession, goToActivity } from "@/lib/data/teacher";
import { buildJourneyMatrix } from "@/lib/domain/journey";
import type { Activity, ActivityStatus, SessionBundle, Team } from "@/lib/types";
import { Alert, Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "@/components/ui/primitives";
import { JourneyHeader, JourneyMap } from "@/components/journey/JourneyMap";
import { JourneyExport } from "@/components/journey/JourneyExport";
import { cn, formatDate } from "@/lib/utils";

export function joinUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/unirse/${code}`;
}

// ------------------------------------------------------------------ ACCESO (código, enlace, QR)
export function AccessPanel({ code, large }: { code: string; large?: boolean }) {
  const url = joinUrl(code);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: "#0a2a52", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [url]);
  return (
    <div className={cn("grid items-center gap-6", large ? "md:grid-cols-[auto_1fr]" : "sm:grid-cols-[auto_1fr]")}>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt={`Código QR para unirse: ${url}`} className={cn("rounded-2xl border border-line bg-white p-2", large ? "h-[min(56vh,520px)] w-auto" : "h-52 w-52")} />
      ) : (
        <div className="h-52 w-52 animate-pulse rounded-2xl bg-canvas" />
      )}
      <div>
        <p className={cn("font-semibold text-muted", large && "text-2xl")}>Código de clase</p>
        <p className={cn("font-mono font-extrabold tracking-[0.2em] text-navy-900", large ? "text-8xl" : "text-5xl")}>{code}</p>
        <p className={cn("mt-3 break-all font-semibold text-brand", large ? "text-2xl" : "text-sm")}>{url.replace(/^https?:\/\//, "")}</p>
        {!large && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar enlace"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ PARTICIPANTES
export function ParticipantsPanel({ bundle, online }: { bundle: SessionBundle; online: Set<string> }) {
  const { participants, teams, session } = bundle;
  const [error, setError] = useState<string | null>(null);
  const count = (t: Team) => participants.filter((p) => p.team_id === t.id).length;
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-navy-900">Estudiantes ({participants.length})</h3>
        <span className="text-sm text-muted">{participants.filter((p) => online.has(p.id)).length} conectados ahora</span>
      </div>
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      {participants.length === 0 ? (
        <p className="py-6 text-center text-muted">Todavía no ha entrado nadie. Proyecta el QR desde la pestaña «Acceso».</p>
      ) : (
        <ul className="divide-y divide-line">
          {participants.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", online.has(p.id) ? "bg-emerald-500" : "bg-line")} aria-label={online.has(p.id) ? "conectado" : "desconectado"} />
              <span className="min-w-[140px] flex-1 font-semibold">
                {p.alias} {p.is_demo && <Badge tone="demo">demo</Badge>}
              </span>
              <Select
                className="h-9 w-auto min-w-[160px] text-sm"
                value={p.team_id ?? ""}
                aria-label={`Equipo de ${p.alias}`}
                onChange={async (e) => {
                  const target = teams.find((t) => t.id === e.target.value);
                  if (target && count(target) >= session.max_per_team && !confirm(`${target.name} ya está completo. ¿Moverlo igualmente?`)) return;
                  setError(await moveParticipant(p.id, e.target.value || null));
                }}
              >
                <option value="">Sin equipo</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({count(t)}/{session.max_per_team})
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Expulsar a ${p.alias}`}
                onClick={async () => confirm(`¿Quitar a ${p.alias} de la clase? Se borrarán sus aportaciones.`) && setError(await removeParticipant(p.id))}
              >
                <UserMinus className="h-4 w-4 text-muted" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ ACTIVIDADES
const STATUS_LABEL: Record<ActivityStatus, { label: string; tone: "neutral" | "success" | "warning" | "dark" }> = {
  pending: { label: "Pendiente", tone: "neutral" },
  active: { label: "Activa", tone: "success" },
  locked: { label: "Bloqueada", tone: "warning" },
  completed: { label: "Completada", tone: "dark" },
};

export function ActivitiesPanel({ bundle }: { bundle: SessionBundle }) {
  const [editing, setEditing] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = bundle.activities.reduce((s, a) => s + a.recommended_minutes, 0);
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-navy-900">Itinerario de la clase</h3>
        <span className="text-sm text-muted">{total} min en total · tiempos orientativos</span>
      </div>
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      <ol className="space-y-2">
        {bundle.activities.map((a) => {
          const isCurrent = a.id === bundle.session.current_activity_id;
          return (
            <li key={a.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5", isCurrent ? "border-brand bg-sky" : "border-line")}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">{a.position}</span>
              <div className="min-w-[200px] flex-1">
                <p className="font-bold text-navy-900">
                  {a.title} {isCurrent && <span className="text-xs font-semibold text-brand">· actual</span>}
                </p>
                <p className="text-xs text-muted">
                  {a.recommended_minutes} min · diapositiva {a.slide_number || "—"}
                </p>
              </div>
              <Badge tone={STATUS_LABEL[a.status].tone}>{STATUS_LABEL[a.status].label}</Badge>
              <div className="flex gap-1">
                {!isCurrent && (
                  <Button size="sm" variant="ghost" onClick={async () => setError(await goToActivity(bundle, a))} title="Ir a esta actividad (la convierte en la actual)">
                    <Play className="h-4 w-4" /> Ir
                  </Button>
                )}
                {a.status === "active" ? (
                  <Button size="sm" variant="ghost" onClick={async () => setError(await setActivityStatus(a.id, "locked"))} aria-label={`Bloquear ${a.title}`}>
                    <Lock className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={async () => setError(await setActivityStatus(a.id, "active"))} aria-label={`Desbloquear ${a.title}`}>
                    <Unlock className="h-4 w-4" />
                  </Button>
                )}
                {a.status !== "completed" && a.status !== "pending" && (
                  <Button size="sm" variant="ghost" onClick={async () => setError(await setActivityStatus(a.id, "completed"))} aria-label={`Finalizar ${a.title}`}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditing(a)} aria-label={`Editar ${a.title}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {editing && <ActivityEditor activity={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

/** Edición de textos, tiempo, diapositiva y campos de una actividad, sin tocar código. */
function ActivityEditor({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const [a, setA] = useState({ ...activity });
  const [configText, setConfigText] = useState(JSON.stringify(activity.config, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    let config: ActivityConfig;
    try {
      config = JSON.parse(configText);
    } catch {
      return setError("La configuración avanzada no es un JSON válido.");
    }
    setBusy(true);
    const e = await updateActivity(activity.id, {
      title: a.title, objective: a.objective, instructions: a.instructions, question: a.question, example: a.example,
      recommended_minutes: Number(a.recommended_minutes) || 0, slide_number: a.slide_number, config,
    });
    setBusy(false);
    if (e) setError(e);
    else onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Editar actividad ${activity.position}`} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Título" htmlFor="ae-t"><Input id="ae-t" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutos" htmlFor="ae-m"><Input id="ae-m" type="number" min={0} max={240} value={a.recommended_minutes} onChange={(e) => setA({ ...a, recommended_minutes: Number(e.target.value) })} /></Field>
          <Field label="Diapositiva asociada" htmlFor="ae-s"><Input id="ae-s" value={a.slide_number} onChange={(e) => setA({ ...a, slide_number: e.target.value })} placeholder="Ej.: 22" /></Field>
        </div>
        <div className="md:col-span-2"><Field label="Pregunta principal" htmlFor="ae-q"><Textarea id="ae-q" rows={2} value={a.question} onChange={(e) => setA({ ...a, question: e.target.value })} /></Field></div>
        <Field label="Objetivo" htmlFor="ae-o"><Textarea id="ae-o" rows={2} value={a.objective} onChange={(e) => setA({ ...a, objective: e.target.value })} /></Field>
        <Field label="Instrucciones" htmlFor="ae-i"><Textarea id="ae-i" rows={2} value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Ejemplo orientativo" htmlFor="ae-e"><Textarea id="ae-e" rows={2} value={a.example} onChange={(e) => setA({ ...a, example: e.target.value })} /></Field></div>
        <details className="md:col-span-2">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Configuración avanzada (campos de respuesta, mínimos…)</summary>
          <Textarea className="mt-2 font-mono text-xs" rows={12} value={configText} onChange={(e) => setConfigText(e.target.value)} aria-label="Configuración JSON" spellCheck={false} />
          <p className="mt-1 text-xs text-muted">Cada campo: key, label, placeholder, row (actions | needs | context), type (text | choice) y options.</p>
        </details>
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} loading={busy}>Guardar cambios</Button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ AJUSTES
export function SettingsPanel({ bundle }: { bundle: SessionBundle }) {
  const { session, teams, participants } = bundle;
  const [s, setS] = useState({ title: session.title, company: session.company, scenario: session.scenario, instructions: session.instructions, max_per_team: session.max_per_team });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/ver/${session.share_token}` : "";

  const save = async () => {
    const e = await updateSession(session.id, { ...s, max_per_team: Number(s.max_per_team) || 1 });
    setMsg(e ? { tone: "error", text: e } : { tone: "success", text: "Cambios guardados." });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="text-lg font-extrabold text-navy-900">Caso y configuración</h3>
        <Field label="Título" htmlFor="st-t"><Input id="st-t" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></Field>
        <Field label="Empresa" htmlFor="st-c"><Input id="st-c" value={s.company} onChange={(e) => setS({ ...s, company: e.target.value })} /></Field>
        <Field label="Escenario" htmlFor="st-s"><Textarea id="st-s" rows={3} value={s.scenario} onChange={(e) => setS({ ...s, scenario: e.target.value })} /></Field>
        <Field label="Instrucciones" htmlFor="st-i"><Textarea id="st-i" rows={2} value={s.instructions} onChange={(e) => setS({ ...s, instructions: e.target.value })} /></Field>
        <Field label="Máximo de alumnos por equipo" htmlFor="st-m"><Input id="st-m" type="number" min={1} max={50} value={s.max_per_team} onChange={(e) => setS({ ...s, max_per_team: Number(e.target.value) })} /></Field>
        <Button onClick={save}>Guardar</Button>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-navy-900">Equipos</h3>
            <Button size="sm" variant="secondary" onClick={() => addTeam(bundle)}><Plus className="h-4 w-4" /> Añadir equipo</Button>
          </div>
          <ul className="space-y-2">
            {teams.map((t) => (
              <TeamRow key={t.id} team={t} members={participants.filter((p) => p.team_id === t.id).length} />
            ))}
          </ul>
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-extrabold text-navy-900">Compartir y comparar</h3>
          <Toggle
            checked={session.comparison_enabled}
            onChange={(v) => updateSession(session.id, { comparison_enabled: v })}
            label="Actividad de comparación"
            hint="Los alumnos podrán ver los resultados de los demás equipos (solo lectura)."
          />
          <Toggle
            checked={session.share_enabled}
            onChange={(v) => updateSession(session.id, { share_enabled: v })}
            label="Enlace público de solo lectura"
            hint="Cualquiera con el enlace podrá ver los Customer Journeys (sin alias de alumnos ni edición)."
          />
          {session.share_enabled && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3 text-sm">
              <Link2 className="h-4 w-4 text-brand" />
              <span className="min-w-0 flex-1 break-all font-mono text-xs">{shareUrl}</span>
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}><Copy className="h-4 w-4" /> Copiar</Button>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-sky"><ExternalLink className="h-4 w-4" /> Abrir</a>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TeamRow({ team, members }: { team: Team; members: number }) {
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);
  return (
    <li className="flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: team.color }} />
      <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== team.name && renameTeam(team.id, name)} aria-label={`Nombre de ${team.name}`} maxLength={40} />
      <span className="w-20 shrink-0 text-xs text-muted">{members} alumnos</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Eliminar ${team.name}`}
        onClick={() => confirm(`¿Eliminar ${team.name}? Se borrará su trabajo y sus alumnos quedarán sin equipo.`) && deleteTeam(team.id)}
      >
        <Trash2 className="h-4 w-4 text-muted" />
      </Button>
    </li>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span>
        <span className="block font-semibold text-navy-900">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

// ------------------------------------------------------------------ RESPUESTAS DE UN EQUIPO
export function TeamResponsesModal({ bundle, team, onClose }: { bundle: SessionBundle; team: Team; onClose: () => void }) {
  const matrix = buildJourneyMatrix(team, bundle.activities, bundle.work, bundle.participants);
  const alias = (id: string | null) => bundle.participants.find((p) => p.id === id)?.alias ?? "—";
  const contribs = bundle.work.contributions.filter((c) => c.team_id === team.id);
  return (
    <Modal open onClose={onClose} wide title={`Respuestas · ${team.name}`}>
      <div className="space-y-5">
        <JourneyHeader matrix={matrix} company={bundle.session.company} scenario={bundle.session.scenario} date={formatDate(new Date())} extra={<JourneyExport bundle={bundle} teamId={team.id} compact />} />
        <JourneyMap matrix={matrix} />
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer font-bold text-navy-900">Todas las aportaciones individuales ({contribs.length})</summary>
          <div className="mt-3 space-y-4">
            {bundle.activities
              .filter((a) => contribs.some((c) => c.activity_id === a.id))
              .map((a) => (
                <section key={a.id}>
                  <h4 className="mb-1 text-sm font-extrabold text-navy-900">{a.position}. {a.title}</h4>
                  <ul className="space-y-1 text-sm">
                    {contribs
                      .filter((c) => c.activity_id === a.id)
                      .map((c) => (
                        <li key={c.id} className="rounded-lg bg-canvas px-3 py-1.5">
                          <span className="text-xs font-semibold text-muted">{a.config.fields?.find((f) => f.key === c.field_key)?.label ?? c.field_key} · {alias(c.participant_id)}{c.selected ? " · ⭐" : ""}</span>
                          <span className="block">{c.content}</span>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
          </div>
        </details>
      </div>
    </Modal>
  );
}
