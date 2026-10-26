import { describe, expect, it } from "vitest";
import { DEFAULT_ACTIVITIES } from "@/lib/config/activities";
import { buildJourneyMatrix, curveHighlights, emotionCurve, emotionDistribution, rankedImprovements, teamProgress } from "@/lib/domain/journey";
import { bundleToCsvRows, bundleToJson, escapeCsv, toCsv } from "@/lib/domain/export";
import { emotionSchema, frictionSchema, kpiSchema, firstError } from "@/lib/domain/validation";
import { friendlyError } from "@/lib/domain/errors";
import { computeTimer } from "@/hooks/use-timer";
import { EMPTY_WORK, type Activity, type SessionBundle, type WorkData } from "@/lib/types";

const T1 = "team-1";
const T2 = "team-2";
const activities: Activity[] = DEFAULT_ACTIVITIES.map((a, i) => ({ ...a, id: `act-${i + 1}`, session_id: "s", status: "pending" }));
const act = (key: string) => activities.find((a) => a.key === key)!;
const now = "2026-10-26T10:00:00Z";

function work(patch: Partial<WorkData>): WorkData {
  return { ...EMPTY_WORK, ...patch };
}

const base = { session_id: "s", created_at: now, updated_at: now };

describe("itinerario por defecto", () => {
  it("suma 120 minutos y sigue el orden de la clase", () => {
    expect(DEFAULT_ACTIVITIES.reduce((s, a) => s + a.recommended_minutes, 0)).toBe(120);
    expect(DEFAULT_ACTIVITIES.filter((a) => a.kind === "phase").map((a) => a.phase_key)).toEqual(["descubrimiento", "consideracion", "compra", "retencion", "recomendacion"]);
    expect(DEFAULT_ACTIVITIES.every((a) => a.slide_number)).toBe(true);
  });
});

describe("progreso", () => {
  it("cuenta las actividades terminadas por el equipo, sin la de acceso", () => {
    const w = work({
      states: [
        { team_id: T1, activity_id: act("acceso").id, session_id: "s", status: "done", updated_by: null, updated_at: now },
        { team_id: T1, activity_id: act("necesidad").id, session_id: "s", status: "done", updated_by: null, updated_at: now },
        { team_id: T1, activity_id: act("descubrimiento").id, session_id: "s", status: "working", updated_by: null, updated_at: now },
        { team_id: T2, activity_id: act("compra").id, session_id: "s", status: "done", updated_by: null, updated_at: now },
      ],
    });
    expect(teamProgress(activities, w, T1)).toEqual({ done: 1, total: 11, percent: 9 });
  });
});

describe("emociones", () => {
  const votes = [
    { id: "v1", team_id: T1, participant_id: "p1", phase_key: "compra" as const, value: 2, reason: "x", activity_id: "a", ...base },
    { id: "v2", team_id: T1, participant_id: "p2", phase_key: "compra" as const, value: 4, reason: "x", activity_id: "a", ...base },
    { id: "v3", team_id: T1, participant_id: "p3", phase_key: "compra" as const, value: 4, reason: "x", activity_id: "a", ...base },
    { id: "v4", team_id: T2, participant_id: "p4", phase_key: "compra" as const, value: 1, reason: "x", activity_id: "a", ...base },
  ];

  it("calcula la distribución de votos del equipo", () => {
    const d = emotionDistribution(votes, T1, "compra");
    expect(d.counts).toEqual([0, 1, 0, 2, 0]);
    expect(d.average).toBeCloseTo(10 / 3);
  });

  it("usa la emoción acordada; si no hay, la media provisional", () => {
    const provisional = emotionCurve(T1, votes, []);
    expect(provisional[2]).toMatchObject({ phase: "compra", value: 3, source: "average" });
    expect(provisional[0]).toMatchObject({ value: null, source: null });
    const agreed = emotionCurve(T1, votes, [{ id: "s1", team_id: T1, phase_key: "compra", value: 5, reason: "acuerdo", chosen_by: "p1", session_id: "s", updated_at: now }]);
    expect(agreed[2]).toMatchObject({ value: 5, source: "team", reason: "acuerdo" });
  });

  it("identifica el mejor y el peor momento", () => {
    const pts = emotionCurve(T1, [...votes, { ...votes[0], id: "v5", phase_key: "descubrimiento", value: 5 }], []);
    const h = curveHighlights(pts);
    expect(h.best?.phase).toBe("descubrimiento");
    expect(h.worst?.phase).toBe("compra");
  });
});

describe("mapa final", () => {
  const participants = [{ id: "p1", session_id: "s", team_id: T1, user_id: "u", alias: "Ana", is_demo: false, joined_at: now }];
  const team = { id: T1, session_id: "s", name: "Equipo 1", color: "#000", position: 1 };
  const c = (id: string, key: string, field: string, selected: boolean, team_id = T1) => ({
    id, team_id, activity_id: act(key).id, participant_id: "p1", field_key: field, phase_key: act(key).phase_key, content: `${key}-${field}-${id}`, selected, ...base,
  });

  it("coloca cada aportación en su fase y fila, priorizando las marcadas con ⭐", () => {
    const w = work({
      contributions: [
        c("1", "descubrimiento", "acciones", false),
        c("2", "descubrimiento", "acciones", true),
        c("3", "descubrimiento", "informacion", false),
        c("4", "necesidad", "inicio", false),
        c("5", "compra", "acciones", false, T2),
      ],
    });
    const m = buildJourneyMatrix(team, activities, w, participants);
    const disc = m.columns[0];
    expect(disc.actions.map((i) => i.id)).toEqual(["2"]);
    expect(disc.needs.map((i) => i.id)).toEqual(["3"]);
    expect(disc.unfiltered).toBe(true);
    expect(m.context.map((i) => i.id)).toEqual(["4"]);
    expect(m.columns[2].actions).toHaveLength(0); // no mezcla datos de otro equipo
    expect(disc.actions[0].author).toBe("Ana");
  });

  it("ordena las mejoras por votos", () => {
    const im = (id: string, priority: "alta" | "baja") => ({
      id, team_id: T1, activity_id: "a", participant_id: "p1", friction_id: null, problem: "p", solution: id, channel: "", phase_key: "compra" as const, benefit: "", priority, ...base,
    });
    const w = work({
      improvements: [im("a", "alta"), im("b", "baja"), im("c", "alta")],
      improvementVotes: [
        { id: "1", session_id: "s", team_id: T1, improvement_id: "b", participant_id: "p1" },
        { id: "2", session_id: "s", team_id: T1, improvement_id: "b", participant_id: "p2" },
        { id: "3", session_id: "s", team_id: T1, improvement_id: "c", participant_id: "p1" },
      ],
    });
    expect(rankedImprovements(w, T1).map((m) => [m.id, m.votes])).toEqual([["b", 2], ["c", 1], ["a", 0]]);
  });
});

describe("exportación", () => {
  it("escapa CSV y neutraliza fórmulas", () => {
    expect(escapeCsv('Dice "hola", y se va')).toBe('"Dice ""hola"", y se va"');
    expect(escapeCsv("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(toCsv([]).startsWith("﻿equipo,tipo")).toBe(true);
  });

  it("exporta por equipo sin filtrar datos de otros ni identificadores privados", () => {
    const bundle: SessionBundle = {
      session: {
        id: "s", teacher_id: "secret-teacher", code: "ABC123", title: "t", subtitle: "", company: "Decathlon", scenario: "x", instructions: "", max_per_team: 5,
        status: "live", current_activity_id: null, timer_ends_at: null, timer_paused_remaining: null, auto_lock_on_timeout: false,
        comparison_enabled: false, share_enabled: false, share_token: "secret-token", is_demo: false, created_at: now, updated_at: now,
      },
      teams: [
        { id: T1, session_id: "s", name: "Equipo 1", color: "#000", position: 1 },
        { id: T2, session_id: "s", name: "Equipo 2", color: "#111", position: 2 },
      ],
      activities,
      participants: [{ id: "p1", session_id: "s", team_id: T1, user_id: "uid-secret", alias: "Ana", is_demo: false, joined_at: now }],
      work: work({
        frictions: [
          { id: "f1", team_id: T1, activity_id: "a", participant_id: "p1", title: "Tallas", description: "", phase_key: "consideracion", severity: "alta", customer_impact: "", business_impact: "", ...base },
          { id: "f2", team_id: T2, activity_id: "a", participant_id: "p1", title: "Otra", description: "", phase_key: "compra", severity: "baja", customer_impact: "", business_impact: "", ...base },
        ],
      }),
    };
    const rows = bundleToCsvRows(bundle, T1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ equipo: "Equipo 1", tipo: "Fricción", fase: "Consideración", autor: "Ana" });
    const json = JSON.stringify(bundleToJson(bundle, T1));
    expect(json).not.toContain("secret-token");
    expect(json).not.toContain("secret-teacher");
    expect(json).not.toContain("uid-secret");
    expect(json).not.toContain("Otra");
  });
});

describe("validación y mensajes", () => {
  it("exige emoji y porqué en la valoración emocional", () => {
    expect(firstError(emotionSchema.safeParse({ value: 0, reason: "ok ok" }))).toMatch(/emoji/);
    expect(firstError(emotionSchema.safeParse({ value: 4, reason: "" }))).toMatch(/Por qué/);
    expect(emotionSchema.safeParse({ value: 4, reason: "Le agobia elegir" }).success).toBe(true);
  });

  it("valida fricciones y KPIs completos", () => {
    expect(firstError(frictionSchema.safeParse({ title: "x", description: "", phase_key: "", severity: "media", customer_impact: "", business_impact: "" }))).toBeTruthy();
    expect(
      kpiSchema.safeParse({ name: "NPS", is_custom: false, measure_what: "Recomendación", phase_key: "recomendacion", data_source: "Encuesta", decision: "Mejorar", improvement_id: null }).success,
    ).toBe(true);
  });

  it("traduce errores técnicos a mensajes comprensibles", () => {
    expect(friendlyError({ message: "TEAM_FULL" })).toMatch(/completo/);
    expect(friendlyError({ message: "new row violates row-level security policy" })).toMatch(/no está abierta/);
  });
});

describe("temporizador", () => {
  it("calcula tiempo restante, pausa y tiempo cumplido", () => {
    const t0 = Date.parse(now);
    expect(computeTimer({ timer_ends_at: new Date(t0 + 90_000).toISOString(), timer_paused_remaining: null }, t0)).toMatchObject({ remaining: 90, running: true, expired: false });
    expect(computeTimer({ timer_ends_at: null, timer_paused_remaining: 30 }, t0)).toMatchObject({ remaining: 30, paused: true });
    expect(computeTimer({ timer_ends_at: new Date(t0 - 5_000).toISOString(), timer_paused_remaining: null }, t0).expired).toBe(true);
  });
});
