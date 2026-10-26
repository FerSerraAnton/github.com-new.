import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { DEFAULT_ACTIVITIES } from "@/lib/config/activities";
import { EMPTY_WORK, type Activity, type SessionBundle } from "@/lib/types";
import { buildJourneyMatrix } from "@/lib/domain/journey";
import { JourneyMap } from "@/components/journey/JourneyMap";
import { JourneyDocument } from "@/components/journey/JourneyDocument";
import { TeamComparison } from "@/components/presentation/TeamComparison";
import { TeamProgressCard } from "@/components/teacher/TeamProgressCard";
import { ActivityWorkspace } from "@/components/student/ActivityWorkspace";
import { LabProvider } from "@/components/student/lab-context";

/** Pruebas de humo: los componentes principales se renderizan con datos realistas sin errores. */
const now = "2026-10-26T10:00:00Z";
const b = { session_id: "s", created_at: now, updated_at: now };
const activities: Activity[] = DEFAULT_ACTIVITIES.map((a, i) => ({ ...a, id: `act-${i + 1}`, session_id: "s", status: i < 4 ? "completed" : i === 4 ? "active" : "pending" }));
const act = (k: string) => activities.find((a) => a.key === k)!;

const bundle: SessionBundle = {
  session: {
    id: "s", teacher_id: "t", code: "ABC123", title: "Caso Decathlon", subtitle: "", company: "Decathlon", scenario: "Quiere empezar a correr.", instructions: "",
    max_per_team: 5, status: "live", current_activity_id: act("compra").id, timer_ends_at: null, timer_paused_remaining: null, auto_lock_on_timeout: false,
    comparison_enabled: true, share_enabled: false, share_token: "x", is_demo: true, created_at: now, updated_at: now,
  },
  teams: [
    { id: "t1", session_id: "s", name: "Equipo 1", color: "#0A5FB4", position: 1 },
    { id: "t2", session_id: "s", name: "Equipo 2", color: "#D9475F", position: 2 },
  ],
  activities,
  participants: [
    { id: "p1", session_id: "s", team_id: "t1", user_id: "u1", alias: "Ana", is_demo: false, joined_at: now },
    { id: "p2", session_id: "s", team_id: "t2", user_id: "u2", alias: "Bea", is_demo: false, joined_at: now },
  ],
  work: {
    ...EMPTY_WORK,
    contributions: [
      { id: "c1", team_id: "t1", activity_id: act("descubrimiento").id, participant_id: "p1", field_key: "acciones", phase_key: "descubrimiento", content: "Busca en Google", selected: true, ...b },
      { id: "c2", team_id: "t1", activity_id: act("necesidad").id, participant_id: "p1", field_key: "inicio", phase_key: null, content: "Le invitan a una carrera", selected: false, ...b },
      { id: "c3", team_id: "t1", activity_id: act("compra").id, participant_id: "p1", field_key: "modalidad", phase_key: "compra", content: "Online", selected: false, ...b },
    ],
    touchpoints: [{ id: "tp1", team_id: "t1", activity_id: act("descubrimiento").id, participant_id: "p1", phase_key: "descubrimiento", channel: "Google", channel_type: "digital", description: "", ...b }],
    emotionVotes: [{ id: "e1", team_id: "t1", activity_id: act("compra").id, participant_id: "p1", phase_key: "compra", value: 2, reason: "Sin talla", ...b }],
    emotionSelections: [{ id: "s1", team_id: "t1", phase_key: "descubrimiento", value: 4, reason: "Ilusión", chosen_by: "p1", session_id: "s", updated_at: now }],
    frictions: [{ id: "f1", team_id: "t1", activity_id: "a", participant_id: "p1", title: "Tallas confusas", description: "", phase_key: "consideracion", severity: "alta", customer_impact: "Duda", business_impact: "Devoluciones", ...b }],
    improvements: [{ id: "m1", team_id: "t1", activity_id: "a", participant_id: "p1", friction_id: "f1", problem: "Tallas", solution: "Test de talla", channel: "Web", phase_key: "consideracion", benefit: "Menos devoluciones", priority: "alta", ...b }],
    improvementVotes: [{ id: "v1", session_id: "s", team_id: "t1", improvement_id: "m1", participant_id: "p1" }],
    kpis: [{ id: "k1", team_id: "t1", activity_id: "a", participant_id: "p1", name: "Tasa de devoluciones", is_custom: false, measure_what: "Devoluciones por talla", phase_key: "retencion", data_source: "ERP", decision: "Ajustar test", improvement_id: "m1", ...b }],
  },
};

const timer = { remaining: 120, running: true, paused: false, expired: false };

describe("renderizado", () => {
  it("mapa del Customer Journey con sus siete filas y la curva emocional", () => {
    const html = renderToString(<JourneyMap matrix={buildJourneyMatrix(bundle.teams[0], activities, bundle.work, bundle.participants)} />);
    for (const s of ["Acciones del cliente", "Puntos de contacto", "Necesidades y expectativas", "Estado emocional", "Puntos de fricción", "Oportunidades de mejora", "KPIs", "Busca en Google", "Tallas confusas", "Test de talla", "Tasa de devoluciones", "😟", "🙂"]) {
      expect(html).toContain(s);
    }
  });

  it("documento imprimible, comparativa y tarjeta del profesor", () => {
    expect(renderToString(<JourneyDocument bundle={bundle} team={bundle.teams[0]} />)).toContain("Decathlon");
    expect(renderToString(<TeamComparison bundle={bundle} />)).toContain("Equipo 2");
    const card = renderToString(<TeamProgressCard bundle={bundle} team={bundle.teams[0]} online={new Set(["p1"])} onOpen={() => {}} />);
    expect(card).toContain("VER RESPUESTAS");
    expect(card).toContain("Compra");
  });

  it("espacio de trabajo de cada tipo de actividad", () => {
    for (const a of activities) {
      const html = renderToString(
        <LabProvider value={{ bundle, me: bundle.participants[0], team: bundle.teams[0], online: new Set(), canWrite: (x) => x.status === "active", aliasOf: () => "Ana" }}>
          <ActivityWorkspace activity={a} timer={timer} isCurrent={a.status === "active"} />
        </LabProvider>,
      );
      expect(html).toContain(a.title.replace(/&/g, "&amp;"));
    }
  });
});
