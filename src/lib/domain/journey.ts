import { countsForProgress } from "../config/activities";
import { EMOTIONS } from "../config/catalogs";
import { PHASES, type PhaseKey } from "../config/phases";
import type {
  Activity, Contribution, EmotionVote, Friction, Improvement, Kpi, Participant, Team,
  TeamEmotionSelection, Touchpoint, WorkData,
} from "../types";

// ---------------------------------------------------------------- progreso
export interface Progress {
  done: number;
  total: number;
  percent: number;
}

export function teamProgress(activities: Activity[], work: Pick<WorkData, "states">, teamId: string): Progress {
  const counted = activities.filter((a) => countsForProgress(a.kind));
  const doneIds = new Set(
    work.states.filter((s) => s.team_id === teamId && s.status === "done").map((s) => s.activity_id),
  );
  const done = counted.filter((a) => doneIds.has(a.id)).length;
  const total = counted.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function isTeamDone(work: Pick<WorkData, "states">, teamId: string, activityId: string) {
  return work.states.some((s) => s.team_id === teamId && s.activity_id === activityId && s.status === "done");
}

// ---------------------------------------------------------------- emociones
export interface EmotionDistribution {
  counts: [number, number, number, number, number];
  total: number;
  average: number | null;
}

export function emotionDistribution(votes: EmotionVote[], teamId: string, phase: PhaseKey): EmotionDistribution {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  let total = 0;
  for (const v of votes) {
    if (v.team_id !== teamId || v.phase_key !== phase) continue;
    if (v.value < 1 || v.value > 5) continue;
    counts[v.value - 1]++;
    sum += v.value;
    total++;
  }
  return { counts, total, average: total ? sum / total : null };
}

export interface EmotionPoint {
  phase: PhaseKey;
  value: number | null;
  /** team = acordada por el equipo; average = media provisional de votos */
  source: "team" | "average" | null;
  reason: string;
  votes: number;
}

export function emotionCurve(
  teamId: string,
  votes: EmotionVote[],
  selections: TeamEmotionSelection[],
): EmotionPoint[] {
  return PHASES.map((p) => {
    const sel = selections.find((s) => s.team_id === teamId && s.phase_key === p.key);
    const dist = emotionDistribution(votes, teamId, p.key);
    if (sel) return { phase: p.key, value: sel.value, source: "team", reason: sel.reason, votes: dist.total };
    if (dist.average !== null) {
      return { phase: p.key, value: Math.round(dist.average), source: "average", reason: "", votes: dist.total };
    }
    return { phase: p.key, value: null, source: null, reason: "", votes: 0 };
  });
}

/** Momentos más alto y más bajo de la curva (para lectura didáctica, no para ranking). */
export function curveHighlights(points: EmotionPoint[]) {
  const valued = points.filter((p) => p.value !== null) as (EmotionPoint & { value: number })[];
  if (!valued.length) return { best: null, worst: null };
  const best = valued.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = valued.reduce((a, b) => (b.value < a.value ? b : a));
  return { best, worst: worst.value < best.value ? worst : null };
}

export function emotionLabel(value: number | null) {
  if (value === null) return null;
  return EMOTIONS[Math.min(5, Math.max(1, Math.round(value))) - 1];
}

// ---------------------------------------------------------------- mapa final
export interface MapItem {
  id: string;
  text: string;
  author: string;
  detail?: string;
  selected?: boolean;
}

export interface PhaseColumn {
  phase: PhaseKey;
  actions: MapItem[];
  touchpoints: (MapItem & { channelType: "digital" | "fisico" })[];
  needs: MapItem[];
  emotion: EmotionPoint;
  frictions: Friction[];
  improvements: (Improvement & { votes: number })[];
  kpis: Kpi[];
  /** true si se muestran aportaciones sin seleccionar porque el equipo aún no eligió */
  unfiltered: boolean;
}

export interface JourneyMatrix {
  team: Team;
  context: MapItem[];
  columns: PhaseColumn[];
}

function authorOf(participants: Participant[], id: string) {
  return participants.find((p) => p.id === id)?.alias ?? "—";
}

/** Si el equipo ha marcado tarjetas como "para el mapa", solo esas; si no, todas. */
function preferSelected(items: Contribution[]) {
  const sel = items.filter((c) => c.selected);
  return { list: sel.length ? sel : items, unfiltered: sel.length === 0 && items.length > 0 };
}

export function buildJourneyMatrix(
  team: Team,
  activities: Activity[],
  work: WorkData,
  participants: Participant[],
): JourneyMatrix {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const teamContribs = work.contributions.filter((c) => c.team_id === team.id);
  const rowOf = (c: Contribution) => {
    const act = byId.get(c.activity_id);
    return act?.config.fields?.find((f) => f.key === c.field_key)?.row ?? "context";
  };
  const labelOf = (c: Contribution) => {
    const act = byId.get(c.activity_id);
    return act?.config.fields?.find((f) => f.key === c.field_key)?.label ?? c.field_key;
  };
  const toItem = (c: Contribution): MapItem => ({
    id: c.id, text: c.content, author: authorOf(participants, c.participant_id), detail: labelOf(c), selected: c.selected,
  });

  const contextContribs = teamContribs.filter((c) => byId.get(c.activity_id)?.kind === "need");
  const context = preferSelected(contextContribs).list.map(toItem);

  const curve = emotionCurve(team.id, work.emotionVotes, work.emotionSelections);
  const voteCount = (id: string) => work.improvementVotes.filter((v) => v.improvement_id === id).length;

  const columns: PhaseColumn[] = PHASES.map((p, i) => {
    const phaseContribs = teamContribs.filter((c) => {
      const act = byId.get(c.activity_id);
      return (c.phase_key ?? act?.phase_key) === p.key && act?.kind === "phase";
    });
    const actions = preferSelected(phaseContribs.filter((c) => rowOf(c) === "actions"));
    const needs = preferSelected(phaseContribs.filter((c) => rowOf(c) === "needs"));
    return {
      phase: p.key,
      actions: actions.list.map(toItem),
      needs: needs.list.map(toItem),
      unfiltered: actions.unfiltered || needs.unfiltered,
      touchpoints: work.touchpoints
        .filter((t: Touchpoint) => t.team_id === team.id && t.phase_key === p.key)
        .map((t) => ({
          id: t.id, text: t.channel, detail: t.description, author: authorOf(participants, t.participant_id), channelType: t.channel_type,
        })),
      emotion: curve[i],
      frictions: work.frictions.filter((f) => f.team_id === team.id && f.phase_key === p.key),
      improvements: work.improvements
        .filter((m) => m.team_id === team.id && m.phase_key === p.key)
        .map((m) => ({ ...m, votes: voteCount(m.id) }))
        .sort((a, b) => b.votes - a.votes),
      kpis: work.kpis.filter((k) => k.team_id === team.id && k.phase_key === p.key),
    };
  });

  return { team, context, columns };
}

/** Mejoras de un equipo ordenadas por votos (desempate: prioridad y antigüedad). */
export function rankedImprovements(work: WorkData, teamId: string) {
  const prio = { alta: 0, media: 1, baja: 2 } as const;
  return work.improvements
    .filter((m) => m.team_id === teamId)
    .map((m) => ({ ...m, votes: work.improvementVotes.filter((v) => v.improvement_id === m.id).length }))
    .sort((a, b) => b.votes - a.votes || prio[a.priority] - prio[b.priority] || a.created_at.localeCompare(b.created_at));
}

/** Número total de aportaciones de un equipo (indicador de actividad, no de calidad). */
export function contributionCount(work: WorkData, teamId: string) {
  const t = (arr: { team_id: string }[]) => arr.filter((x) => x.team_id === teamId).length;
  return t(work.contributions) + t(work.touchpoints) + t(work.emotionVotes) + t(work.frictions) + t(work.improvements) + t(work.kpis);
}
