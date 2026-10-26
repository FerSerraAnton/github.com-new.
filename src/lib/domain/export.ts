import { EMOTIONS, SEVERITIES } from "../config/catalogs";
import { PHASE_BY_KEY, isPhaseKey } from "../config/phases";
import type { SessionBundle } from "../types";

export interface CsvRow {
  equipo: string;
  tipo: string;
  fase: string;
  campo: string;
  contenido: string;
  detalle: string;
  autor: string;
  fecha: string;
}

const HEADERS: (keyof CsvRow)[] = ["equipo", "tipo", "fase", "campo", "contenido", "detalle", "autor", "fecha"];

export function escapeCsv(value: string) {
  const v = value ?? "";
  // Evita inyección de fórmulas al abrir en Excel.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvRow[]) {
  const lines = [HEADERS.join(","), ...rows.map((r) => HEADERS.map((h) => escapeCsv(r[h])).join(","))];
  // BOM para que Excel detecte UTF-8 (acentos y emojis).
  return "﻿" + lines.join("\r\n");
}

const phaseName = (k: string | null | undefined) => (k && isPhaseKey(k) ? PHASE_BY_KEY[k].name : "");

/** Aplana todo el trabajo de una sesión (o de un equipo) en filas CSV. */
export function bundleToCsvRows(bundle: SessionBundle, teamId?: string): CsvRow[] {
  const { teams, activities, participants, work } = bundle;
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "";
  const alias = (id: string | null) => participants.find((p) => p.id === id)?.alias ?? "";
  const keep = (t: string) => !teamId || t === teamId;
  const rows: CsvRow[] = [];

  for (const c of work.contributions.filter((x) => keep(x.team_id))) {
    const act = activities.find((a) => a.id === c.activity_id);
    const field = act?.config.fields?.find((f) => f.key === c.field_key);
    rows.push({
      equipo: teamName(c.team_id), tipo: "Aportación", fase: phaseName(c.phase_key ?? act?.phase_key) || act?.title || "",
      campo: field?.label ?? c.field_key, contenido: c.content, detalle: c.selected ? "Seleccionada para el mapa" : "",
      autor: alias(c.participant_id), fecha: c.created_at,
    });
  }
  for (const t of work.touchpoints.filter((x) => keep(x.team_id))) {
    rows.push({
      equipo: teamName(t.team_id), tipo: "Punto de contacto", fase: phaseName(t.phase_key), campo: t.channel_type === "fisico" ? "Físico" : "Digital",
      contenido: t.channel, detalle: t.description, autor: alias(t.participant_id), fecha: t.created_at,
    });
  }
  for (const v of work.emotionVotes.filter((x) => keep(x.team_id))) {
    const e = EMOTIONS[v.value - 1];
    rows.push({
      equipo: teamName(v.team_id), tipo: "Voto emocional", fase: phaseName(v.phase_key), campo: `${e.emoji} ${e.label} (${v.value})`,
      contenido: v.reason, detalle: "", autor: alias(v.participant_id), fecha: v.updated_at,
    });
  }
  for (const s of work.emotionSelections.filter((x) => keep(x.team_id))) {
    const e = EMOTIONS[s.value - 1];
    rows.push({
      equipo: teamName(s.team_id), tipo: "Emoción del equipo", fase: phaseName(s.phase_key), campo: `${e.emoji} ${e.label} (${s.value})`,
      contenido: s.reason, detalle: "", autor: alias(s.chosen_by), fecha: s.updated_at,
    });
  }
  for (const f of work.frictions.filter((x) => keep(x.team_id))) {
    const sev = SEVERITIES.find((s) => s.value === f.severity);
    rows.push({
      equipo: teamName(f.team_id), tipo: "Fricción", fase: phaseName(f.phase_key), campo: `Gravedad ${sev?.label ?? f.severity}`,
      contenido: `${f.title}: ${f.description}`, detalle: `Cliente: ${f.customer_impact} | Empresa: ${f.business_impact}`,
      autor: alias(f.participant_id), fecha: f.created_at,
    });
  }
  for (const m of work.improvements.filter((x) => keep(x.team_id))) {
    const votes = work.improvementVotes.filter((v) => v.improvement_id === m.id).length;
    rows.push({
      equipo: teamName(m.team_id), tipo: "Mejora", fase: phaseName(m.phase_key), campo: `Prioridad ${m.priority} · ${votes} votos`,
      contenido: m.solution, detalle: `Problema: ${m.problem} | Canal: ${m.channel} | Beneficio: ${m.benefit}`,
      autor: alias(m.participant_id), fecha: m.created_at,
    });
  }
  for (const k of work.kpis.filter((x) => keep(x.team_id))) {
    rows.push({
      equipo: teamName(k.team_id), tipo: k.is_custom ? "KPI personalizado" : "KPI", fase: phaseName(k.phase_key), campo: k.name,
      contenido: k.measure_what, detalle: `Fuente: ${k.data_source} | Decisión: ${k.decision}`,
      autor: alias(k.participant_id), fecha: k.created_at,
    });
  }
  for (const s of work.summaries.filter((x) => keep(x.team_id))) {
    rows.push({
      equipo: teamName(s.team_id), tipo: "Pitch del equipo", fase: phaseName(s.detected_phase), campo: "Conclusión",
      contenido: `Detectamos ${s.detected} en la fase ${phaseName(s.detected_phase) || s.detected_phase}. Proponemos ${s.proposal} porque ${s.because}. Lo mediremos con ${s.measure_with}.`,
      detalle: s.conclusion, autor: alias(s.updated_by), fecha: s.updated_at,
    });
  }
  return rows.sort((a, b) => a.equipo.localeCompare(b.equipo) || a.fecha.localeCompare(b.fecha));
}

/** JSON de la sesión completa (o filtrado a un equipo), sin user_id ni token de compartir. */
export function bundleToJson(bundle: SessionBundle, teamId?: string) {
  const keep = <T extends { team_id: string }>(arr: T[]) => (teamId ? arr.filter((x) => x.team_id === teamId) : arr);
  const { share_token: _token, teacher_id: _teacher, ...session } = bundle.session;
  void _token;
  void _teacher;
  return {
    exported_at: new Date().toISOString(),
    app: "UAX Journey Lab",
    note: "Los KPIs son propuestas de medición del alumnado, no métricas reales de la empresa.",
    session,
    teams: teamId ? bundle.teams.filter((t) => t.id === teamId) : bundle.teams,
    activities: bundle.activities,
    participants: bundle.participants
      .filter((p) => !teamId || p.team_id === teamId)
      .map(({ id, alias, team_id, is_demo }) => ({ id, alias, team_id, is_demo })),
    work: {
      team_activity_states: keep(bundle.work.states),
      contributions: keep(bundle.work.contributions),
      touchpoints: keep(bundle.work.touchpoints),
      emotion_votes: keep(bundle.work.emotionVotes),
      team_emotion_selections: keep(bundle.work.emotionSelections),
      frictions: keep(bundle.work.frictions),
      improvements: keep(bundle.work.improvements),
      improvement_votes: keep(bundle.work.improvementVotes),
      kpis: keep(bundle.work.kpis),
      team_journey_summaries: keep(bundle.work.summaries),
    },
  };
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
