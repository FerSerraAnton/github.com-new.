"use client";
import { useState } from "react";
import { Plus, Smartphone, Store, Trash2 } from "lucide-react";
import { CHANNELS, type ChannelType } from "@/lib/config/catalogs";
import { PHASE_BY_KEY, type PhaseKey } from "@/lib/config/phases";
import { addTouchpoint, deleteRow } from "@/lib/data/mutations";
import { firstError, touchpointSchema } from "@/lib/domain/validation";
import type { Activity } from "@/lib/types";
import { Button, Input } from "@/components/ui/primitives";
import { useLab } from "@/components/student/lab-context";
import { cn } from "@/lib/utils";

/** Puntos de contacto de una fase: canales del catálogo o nuevos, digitales o físicos. */
export function TouchpointEditor({ activity, phase, label }: { activity: Activity; phase: PhaseKey; label: string }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const p = PHASE_BY_KEY[phase];
  const list = bundle.work.touchpoints.filter((t) => t.team_id === team.id && t.phase_key === phase);
  const [channel, setChannel] = useState("");
  const [type, setType] = useState<ChannelType>("digital");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (name: string, t: ChannelType) => {
    setChannel(name);
    setType(t);
  };

  const submit = async () => {
    const parsed = touchpointSchema.safeParse({ channel, channel_type: type, description });
    const msg = firstError(parsed);
    if (msg) return setError(msg);
    setBusy(true);
    const err = await addTouchpoint(activity, me, phase, { channel: channel.trim(), channel_type: type, description: description.trim() });
    setBusy(false);
    if (err) return setError(err);
    setChannel("");
    setDescription("");
    setError(null);
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold text-navy-900">{label}</h3>
        <span className="text-xs font-semibold text-muted">{list.length} puntos de contacto</span>
      </div>

      {list.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {list.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-2.5 pr-1.5 text-sm animate-rise" style={{ borderColor: `${p.color}55` }}>
              {t.channel_type === "fisico" ? <Store className="h-3.5 w-3.5 text-muted" aria-label="Físico" /> : <Smartphone className="h-3.5 w-3.5 text-muted" aria-label="Digital" />}
              <span className="font-semibold">{t.channel}</span>
              {t.description && <span className="hidden max-w-[220px] truncate text-muted sm:inline" title={t.description}>· {t.description}</span>}
              <span className="text-xs text-muted">({aliasOf(t.participant_id)})</span>
              {t.participant_id === me.id && writable && (
                <button type="button" onClick={() => deleteRow("touchpoints", t.id)} className="cursor-pointer rounded-full p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${t.channel}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {writable && (
        <div className="space-y-3 rounded-xl bg-canvas p-3">
          {(["digital", "fisico"] as const).map((group) => (
            <div key={group}>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted">
                {group === "digital" ? <Smartphone className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                {group === "digital" ? "Canales digitales" : "Canales físicos y personales"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.filter((c) => c.type === group).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => pick(c.name, c.type)}
                    aria-pressed={channel === c.name}
                    className={cn(
                      "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                      channel === c.name ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand-light",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="…o escribe otro canal (Otros)" aria-label="Canal" maxLength={60} />
            <div className="flex rounded-xl border border-line bg-white p-1" role="group" aria-label="Tipo de canal">
              {(["digital", "fisico"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={cn("cursor-pointer rounded-lg px-3 text-sm font-semibold", type === t ? "bg-navy-900 text-white" : "text-muted")}
                >
                  {t === "digital" ? "Digital" : "Físico"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué hace o qué busca ahí? (opcional)" aria-label="Descripción del punto de contacto" maxLength={500} />
            <Button onClick={submit} loading={busy} disabled={!channel.trim()}>
              <Plus className="h-4 w-4" /> Añadir punto de contacto
            </Button>
          </div>
          {error && (
            <p className="text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
