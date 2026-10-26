"use client";
import { useEffect, useState } from "react";
import { Check, Users } from "lucide-react";
import { EMOTIONS } from "@/lib/config/catalogs";
import { PHASE_BY_KEY, type PhaseKey } from "@/lib/config/phases";
import { clearTeamEmotion, setTeamEmotion, upsertEmotionVote } from "@/lib/data/mutations";
import { emotionDistribution } from "@/lib/domain/journey";
import { emotionSchema, firstError } from "@/lib/domain/validation";
import type { Activity } from "@/lib/types";
import { Button, Textarea } from "@/components/ui/primitives";
import { useLab } from "@/components/student/lab-context";
import { EmotionSelector } from "./EmotionSelector";
import { EmotionDistribution } from "./EmotionDistribution";

/**
 * Valoración emocional de una fase: voto individual (emoji + porqué obligatorio),
 * distribución del equipo y emoción acordada que irá al mapa final.
 */
export function EmotionVotePanel({ activity, phase, compact }: { activity: Activity; phase: PhaseKey; compact?: boolean }) {
  const { bundle, me, team, canWrite, aliasOf } = useLab();
  const writable = canWrite(activity);
  const p = PHASE_BY_KEY[phase];
  const myVote = bundle.work.emotionVotes.find((v) => v.participant_id === me.id && v.phase_key === phase);
  const teamVotes = bundle.work.emotionVotes.filter((v) => v.team_id === team.id && v.phase_key === phase);
  const selection = bundle.work.emotionSelections.find((s) => s.team_id === team.id && s.phase_key === phase);
  const dist = emotionDistribution(bundle.work.emotionVotes, team.id, phase);

  const [value, setValue] = useState<number | null>(myVote?.value ?? null);
  const [reason, setReason] = useState(myVote?.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teamReason, setTeamReason] = useState(selection?.reason ?? "");

  // Si llega el voto desde otro dispositivo (o tras recargar), sincronizar.
  useEffect(() => {
    if (myVote) {
      setValue(myVote.value);
      setReason(myVote.reason);
    }
  }, [myVote?.id, myVote?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setTeamReason(selection?.reason ?? ""), [selection?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const msg = firstError(emotionSchema.safeParse({ value: value ?? 0, reason }));
    if (msg) return setError(msg);
    setBusy(true);
    const err = await upsertEmotionVote(activity, me, phase, value!, reason);
    setBusy(false);
    if (err) return setError(err);
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const choose = async (v: number) => {
    if (selection?.value === v) return clearTeamEmotion(team.id, phase);
    const fallback = teamVotes.find((x) => x.value === v)?.reason ?? "";
    await setTeamEmotion(me, phase, v, teamReason.trim() || fallback);
  };

  const dirty = value !== (myVote?.value ?? null) || reason !== (myVote?.reason ?? "");

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5" style={{ borderTop: `4px solid ${p.color}` }}>
      <header className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: p.color }}>
          Termómetro del cliente · {p.name}
        </p>
        <h3 className="text-lg font-extrabold text-navy-900">¿Cómo se siente el cliente en esta fase?</h3>
      </header>

      <div className={compact ? "grid gap-5 lg:grid-cols-[1.3fr_1fr]" : "grid gap-6 lg:grid-cols-[1.4fr_1fr]"}>
        <div className="space-y-3">
          <EmotionSelector value={value} onChange={(v) => setValue(v)} disabled={!writable} size={compact ? "md" : "lg"} label={`Tu valoración para ${p.name}`} />
          <div>
            <label htmlFor={`reason-${phase}`} className="mb-1 block text-sm font-semibold text-navy-900">
              ¿Por qué crees que el cliente se siente así? <span className="text-red-600">*</span>
            </label>
            <Textarea
              id={`reason-${phase}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!writable}
              rows={2}
              maxLength={600}
              placeholder="Justifica con un hecho del recorrido"
              aria-required
            />
          </div>
          {writable && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} loading={busy} disabled={!dirty && !!myVote}>
                {myVote ? "Actualizar mi voto" : "Guardar mi voto"}
              </Button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 animate-rise">
                  <Check className="h-4 w-4" /> ¡Voto guardado!
                </span>
              )}
              {error && (
                <span className="text-sm font-medium text-red-700" role="alert">
                  {error}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-canvas p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-navy-900">
            <Users className="h-4 w-4" /> Votos del equipo
          </p>
          <EmotionDistribution dist={dist} chosen={selection?.value} onChoose={writable ? choose : undefined} disabled={!writable} />
          {teamVotes.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-brand">Ver los porqués ({teamVotes.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {teamVotes.map((v) => (
                  <li key={v.id} className="rounded-lg bg-white px-2 py-1.5">
                    <span className="emoji mr-1">{EMOTIONS[v.value - 1].emoji}</span>
                    <b>{aliasOf(v.participant_id)}:</b> {v.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3 border-t border-line pt-3">
            <label htmlFor={`team-reason-${phase}`} className="mb-1 block text-xs font-bold text-navy-900">
              Síntesis del equipo (para el mapa final)
            </label>
            <Textarea
              id={`team-reason-${phase}`}
              value={teamReason}
              onChange={(e) => setTeamReason(e.target.value)}
              onBlur={() => selection && teamReason !== selection.reason && setTeamEmotion(me, phase, selection.value, teamReason)}
              disabled={!writable}
              rows={2}
              maxLength={600}
              className="bg-white text-sm"
              placeholder="Escribid el porqué acordado y pulsad «Elegir» en una emoción"
            />
            {selection && (
              <p className="mt-1 text-xs text-muted">
                Emoción del equipo: <span className="emoji">{EMOTIONS[selection.value - 1].emoji}</span> elegida por {aliasOf(selection.chosen_by)}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
