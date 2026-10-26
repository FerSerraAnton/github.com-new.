"use client";
import { DEFAULT_ACTIVITIES, DEFAULT_CASE } from "../config/activities";
import type { PhaseKey } from "../config/phases";
import { getSupabase } from "../supabase/client";
import { createSession } from "./teacher";
import type { Activity, Participant, Team } from "../types";

/**
 * Sesión de demostración con datos FICTICIOS, marcada con is_demo y el prefijo [DEMO]
 * para que nunca se confunda con respuestas reales de estudiantes.
 */
type TeamSeed = {
  people: string[];
  contributions: Record<string, Record<string, string[]>>; // activityKey → fieldKey → textos
  touchpoints: [PhaseKey, string, "digital" | "fisico", string][];
  emotions: Record<PhaseKey, [number, string]>;
  frictions: { title: string; description: string; phase_key: PhaseKey; severity: "baja" | "media" | "alta"; customer_impact: string; business_impact: string }[];
  improvements: { problem: string; solution: string; channel: string; phase_key: PhaseKey; benefit: string; priority: "baja" | "media" | "alta"; votes: number }[];
  kpis: { name: string; is_custom: boolean; measure_what: string; phase_key: PhaseKey; data_source: string; decision: string }[];
  pitch: { detected: string; detected_phase: PhaseKey; proposal: string; because: string; measure_with: string; conclusion: string };
};

const SEEDS: TeamSeed[] = [
  {
    people: ["Demo · Ana", "Demo · Bruno", "Demo · Carla"],
    contributions: {
      necesidad: {
        inicio: ["El viaje comienza cuando su médico le recomienda hacer ejercicio cardiovascular."],
        necesidad: ["Empezar a correr de forma segura y sin lesionarse."],
        problema: ["No sabe qué diferencia hay entre una zapatilla de running y una de calle."],
        objetivo: ["Correr 5 km seguidos en dos meses gastando menos de 60 €."],
        origen: ["Estímulo externo"],
      },
      descubrimiento: {
        acciones: ["Busca en Google «mejores zapatillas running principiante»", "Pregunta a una amiga que corre"],
        informacion: ["Qué tipo de pisada tiene y si importa"],
        expectativas: ["Una guía sencilla que le diga qué comprar"],
      },
      consideracion: {
        acciones: ["Compara tres modelos en la web de Decathlon filtrando por precio"],
        alternativas: ["Kalenji vs. una marca deportiva conocida en un marketplace"],
        dudas: ["No entiende la diferencia entre amortiguación y estabilidad", "¿Qué talla pedir si está entre dos?"],
        factores: ["Precio y opiniones de otros corredores principiantes"],
      },
      compra: {
        modalidad: ["Combinación de ambas"],
        acciones: ["Se prueba dos tallas en tienda y compra en la app la que le falta en su color"],
        expectativas: ["Recibirlas en 48 horas"],
        obstaculos: ["Su talla no está en tienda"],
      },
      retencion: {
        primera_experiencia: ["Las primeras salidas son cómodas, pero le roza el talón"],
        interacciones: ["Recibe un email con un plan de entrenamiento de 0 a 5 km"],
        necesidades_atencion: ["Saber si puede cambiar las zapatillas ya usadas"],
      },
      recomendacion: {
        experiencia_final: ["Completa su primera carrera popular de 5 km"],
        motivos: ["Buena relación calidad-precio y el consejo del vendedor"],
        insatisfaccion: ["Tuvo que preguntar dos veces por la política de cambios"],
      },
    },
    touchpoints: [
      ["descubrimiento", "Google", "digital", "Búsqueda genérica"],
      ["descubrimiento", "Recomendaciones", "fisico", "Una amiga corredora"],
      ["consideracion", "Web de la empresa", "digital", "Filtros por precio"],
      ["consideracion", "Opiniones y reseñas", "digital", ""],
      ["compra", "Probador", "fisico", ""],
      ["compra", "App", "digital", "Compra de la talla que faltaba"],
      ["retencion", "Correo electrónico", "digital", "Plan de entrenamiento"],
      ["recomendacion", "Redes sociales", "digital", "Foto de su primera carrera"],
    ],
    emotions: {
      descubrimiento: [4, "Ilusión por empezar, aunque hay demasiada información"],
      consideracion: [2, "Se agobia con los términos técnicos"],
      compra: [3, "La compra cumple, pero le falta su talla en tienda"],
      retencion: [4, "Le gusta el plan de entrenamiento"],
      recomendacion: [5, "Orgullo al terminar su primera carrera"],
    },
    frictions: [
      { title: "No sabe qué tipo de zapatilla necesita", description: "Demasiadas categorías técnicas", phase_key: "descubrimiento", severity: "media", customer_impact: "Inseguridad y búsqueda más larga", business_impact: "Riesgo de que compre en otro sitio" },
      { title: "No entiende tallas ni diferencias", description: "Duda entre dos tallas y dos tecnologías", phase_key: "consideracion", severity: "alta", customer_impact: "Miedo a equivocarse", business_impact: "Más devoluciones y consultas" },
      { title: "Política de cambios poco clara", description: "No sabe si puede cambiar un producto usado", phase_key: "retencion", severity: "media", customer_impact: "Frustración tras la compra", business_impact: "Peor valoración y menos recompra" },
    ],
    improvements: [
      { problem: "No entiende tallas ni diferencias", solution: "Test de 3 preguntas en la ficha que recomiende modelo y talla", channel: "Web y app", phase_key: "consideracion", benefit: "Decisión más rápida y menos devoluciones por talla", priority: "alta", votes: 3 },
      { problem: "Política de cambios poco clara", solution: "Mensaje automático tras 7 días explicando la garantía de prueba", channel: "Email", phase_key: "retencion", benefit: "Más confianza y menos consultas", priority: "media", votes: 2 },
      { problem: "No sabe qué tipo de zapatilla necesita", solution: "Vídeo corto «tu primera zapatilla» en YouTube y en tienda", channel: "YouTube / tienda", phase_key: "descubrimiento", benefit: "Atraer al principiante con contenido útil", priority: "baja", votes: 1 },
    ],
    kpis: [
      { name: "Tasa de devoluciones", is_custom: false, measure_what: "Devoluciones por talla en zapatillas de iniciación", phase_key: "retencion", data_source: "Registro de devoluciones", decision: "Si no baja, revisar la recomendación del test" },
      { name: "Uso del test de talla", is_custom: true, measure_what: "% de visitas a ficha que completan el test", phase_key: "consideracion", data_source: "Analítica web", decision: "Si es bajo, darle más visibilidad" },
    ],
    pitch: {
      detected: "que el cliente no entiende tallas ni diferencias técnicas",
      detected_phase: "consideracion",
      proposal: "un test de 3 preguntas que recomiende modelo y talla",
      because: "reduce la inseguridad y las devoluciones",
      measure_with: "la tasa de devoluciones por talla",
      conclusion: "El momento más importante es la consideración: ahí se decide si confía en la marca.",
    },
  },
  {
    people: ["Demo · Diego", "Demo · Elena", "Demo · Fran"],
    contributions: {
      necesidad: {
        inicio: ["El viaje comienza cuando unos compañeros le proponen una carrera solidaria."],
        necesidad: ["Equiparse para correr sin gastar mucho"],
        objetivo: ["Llegar a la meta de la carrera solidaria"],
        origen: ["Estímulo externo"],
      },
      descubrimiento: { acciones: ["Ve un anuncio de Decathlon en Instagram"], informacion: ["Precio de zapatillas básicas"] },
      consideracion: { acciones: ["Lee reseñas en la web"], factores: ["Precio por debajo de 50 €"] },
      compra: { modalidad: ["Online"], acciones: ["Compra en la web con recogida en tienda"], obstaculos: ["Plazo de recogida de 3 días"] },
      retencion: { primera_experiencia: ["Cómodas desde el primer día"], interacciones: ["Valora el producto en la web"] },
      recomendacion: { motivos: ["Precio imbatible"], experiencia_final: ["Lo recomienda en el grupo de WhatsApp de la carrera"] },
    },
    touchpoints: [
      ["descubrimiento", "Redes sociales", "digital", "Anuncio en Instagram"],
      ["consideracion", "Opiniones y reseñas", "digital", ""],
      ["compra", "Web de la empresa", "digital", "Click & collect"],
      ["compra", "Caja", "fisico", "Recogida"],
      ["recomendacion", "Recomendaciones", "fisico", "Grupo de WhatsApp"],
    ],
    emotions: {
      descubrimiento: [4, "El anuncio le motiva"],
      consideracion: [4, "Las reseñas le dan confianza"],
      compra: [2, "La espera para recoger se le hace larga"],
      retencion: [4, "Cumple lo que esperaba"],
      recomendacion: [4, "Lo recomienda por precio"],
    },
    frictions: [
      { title: "Espera larga en click & collect", description: "Tres días para recoger", phase_key: "compra", severity: "alta", customer_impact: "Impaciencia, quiere estrenarlas ya", business_impact: "Puede cancelar y comprar en otra tienda" },
      { title: "Anuncio genérico", description: "No habla de principiantes", phase_key: "descubrimiento", severity: "baja", customer_impact: "No se siente identificado", business_impact: "Menor CTR" },
      { title: "Sin seguimiento tras la compra", description: "Nadie le pregunta qué tal", phase_key: "retencion", severity: "media", customer_impact: "Se siente un número más", business_impact: "Se pierde la recompra" },
    ],
    improvements: [
      { problem: "Espera larga en click & collect", solution: "Mostrar en la ficha qué tienda cercana tiene stock hoy", channel: "Web", phase_key: "compra", benefit: "Recoger en 2 horas", priority: "alta", votes: 3 },
      { problem: "Sin seguimiento tras la compra", solution: "Reto de 30 días en la app con recordatorios", channel: "App", phase_key: "retencion", benefit: "Hábito de uso y recompra de accesorios", priority: "media", votes: 2 },
      { problem: "Anuncio genérico", solution: "Campaña específica «empiezo a correr»", channel: "Redes sociales", phase_key: "descubrimiento", benefit: "Mejor segmentación", priority: "baja", votes: 0 },
    ],
    kpis: [{ name: "Tasa de conversión", is_custom: false, measure_what: "Compras / visitas a ficha con stock en tienda visible", phase_key: "compra", data_source: "Analítica web y TPV", decision: "Extender a más categorías si sube" }],
    pitch: {
      detected: "una espera larga para recoger el pedido",
      detected_phase: "compra",
      proposal: "mostrar el stock de la tienda más cercana en la ficha",
      because: "el principiante quiere empezar ya",
      measure_with: "la tasa de conversión",
      conclusion: "",
    },
  },
  {
    people: ["Demo · Gala", "Demo · Hugo"],
    contributions: {
      necesidad: { inicio: ["El viaje comienza cuando decide cuidarse tras un chequeo médico."], origen: ["Iniciativa propia"] },
      descubrimiento: { acciones: ["Entra directamente en una tienda Decathlon"], expectativas: ["Que alguien le aconseje"] },
      consideracion: { acciones: ["Pide consejo a un vendedor"], dudas: ["¿Necesito un análisis de pisada?"] },
      compra: { modalidad: ["Presencial"], acciones: ["Paga en caja tras probárselas"] },
      retencion: { primera_experiencia: ["Le molestan en tiradas largas"], necesidades_atencion: ["Consejos de uso"] },
      recomendacion: { insatisfaccion: ["Nadie le explicó cómo adaptarse"] },
    },
    touchpoints: [
      ["descubrimiento", "Tienda física", "fisico", ""],
      ["consideracion", "Vendedor", "fisico", "Consejo personal"],
      ["compra", "Caja", "fisico", ""],
      ["retencion", "Tienda física", "fisico", "Vuelve a preguntar"],
    ],
    emotions: {
      descubrimiento: [3, "Va con dudas"],
      consideracion: [5, "El vendedor le da mucha confianza"],
      compra: [4, "Compra rápida"],
      retencion: [2, "Molestias en tiradas largas"],
      recomendacion: [3, "Recomendaría la tienda, no tanto el producto"],
    },
    frictions: [
      { title: "Molestias sin explicación", description: "No sabe si es normal", phase_key: "retencion", severity: "alta", customer_impact: "Riesgo de abandonar el running", business_impact: "Cliente perdido" },
      { title: "Depende de que haya un vendedor libre", description: "", phase_key: "consideracion", severity: "media", customer_impact: "Espera", business_impact: "Ventas perdidas en horas punta" },
      { title: "No hay seguimiento posventa", description: "", phase_key: "recomendacion", severity: "baja", customer_impact: "No recomienda", business_impact: "Menos boca a boca" },
    ],
    improvements: [
      { problem: "Molestias sin explicación", solution: "Tarjeta con QR a vídeos de adaptación y consulta gratuita a los 15 días", channel: "Tienda / app", phase_key: "retencion", benefit: "Menos abandonos y más satisfacción", priority: "alta", votes: 2 },
    ],
    kpis: [{ name: "Satisfacción del cliente", is_custom: false, measure_what: "CSAT a los 15 días de la compra", phase_key: "retencion", data_source: "Encuesta por email", decision: "Si es baja, reforzar el consejo en tienda" }],
    pitch: { detected: "", detected_phase: "retencion", proposal: "", because: "", measure_with: "", conclusion: "" },
  },
];

export async function createDemoSession(): Promise<{ id?: string; error?: string }> {
  const created = await createSession({
    title: `[DEMO] ${DEFAULT_CASE.title}`,
    company: DEFAULT_CASE.company,
    scenario: DEFAULT_CASE.scenario,
    instructions: `${DEFAULT_CASE.instructions} — Esta sesión contiene datos ficticios de demostración.`,
    max_per_team: 5,
    team_count: SEEDS.length,
    is_demo: true,
    activities: DEFAULT_ACTIVITIES,
  });
  if (!created.id) return created;
  const sessionId = created.id;
  const sb = getSupabase();
  try {
    const must = <T,>(r: { data: T | null; error: { message: string } | null }) => {
      if (r.error) throw new Error(r.error.message);
      return r.data as T;
    };
    const teams = must<Team[]>(await sb.from("teams").select("*").eq("session_id", sessionId).order("position"));
    const acts = must<Activity[]>(await sb.from("activities").select("*").eq("session_id", sessionId).order("position"));
    const act = (key: string) => acts.find((a) => a.key === key)!;

    for (let ti = 0; ti < SEEDS.length; ti++) {
      const seed = SEEDS[ti];
      const team = teams[ti];
      const people = must<Participant[]>(
        await sb
          .from("participants")
          .insert(seed.people.map((alias) => ({ session_id: sessionId, team_id: team.id, alias, is_demo: true })))
          .select("*"),
      );
      const who = (i: number) => people[i % people.length].id;
      let n = 0;
      const rows: Record<string, unknown>[] = [];
      for (const [aKey, fields] of Object.entries(seed.contributions)) {
        for (const [fKey, texts] of Object.entries(fields)) {
          for (const t of texts) rows.push({ team_id: team.id, activity_id: act(aKey).id, participant_id: who(n++), field_key: fKey, phase_key: act(aKey).phase_key, content: t, selected: n % 3 !== 0 });
        }
      }
      must(await sb.from("contributions").insert(rows));
      must(
        await sb.from("touchpoints").insert(
          seed.touchpoints.map(([phase, channel, type, description], i) => ({ team_id: team.id, activity_id: act(phase).id, participant_id: who(i), phase_key: phase, channel, channel_type: type, description })),
        ),
      );
      const votes: Record<string, unknown>[] = [];
      for (const [phase, [value, reason]] of Object.entries(seed.emotions)) {
        people.forEach((p, i) => {
          const v = Math.max(1, Math.min(5, value + (i === 1 ? -1 : i === 2 ? 1 : 0)));
          votes.push({ team_id: team.id, activity_id: act(phase).id, participant_id: p.id, phase_key: phase, value: v, reason: i === 0 ? reason : "Voto de demostración" });
        });
      }
      must(await sb.from("emotion_votes").insert(votes));
      must(
        await sb.from("team_emotion_selections").insert(
          Object.entries(seed.emotions).map(([phase, [value, reason]]) => ({ team_id: team.id, phase_key: phase, value, reason, chosen_by: people[0].id })),
        ),
      );
      const fr = must<{ id: string; title: string }[]>(
        await sb.from("frictions").insert(seed.frictions.map((f, i) => ({ ...f, team_id: team.id, activity_id: act("fricciones").id, participant_id: who(i) }))).select("id, title"),
      );
      const ims = must<{ id: string }[]>(
        await sb
          .from("improvements")
          .insert(
            seed.improvements.map(({ votes: _v, ...m }, i) => {
              void _v;
              return { ...m, friction_id: fr.find((f) => f.title === m.problem)?.id ?? null, team_id: team.id, activity_id: act("mejoras").id, participant_id: who(i) };
            }),
          )
          .select("id"),
      );
      const imVotes = seed.improvements.flatMap((m, i) => people.slice(0, m.votes).map((p) => ({ improvement_id: ims[i].id, participant_id: p.id, team_id: team.id })));
      if (imVotes.length) must(await sb.from("improvement_votes").insert(imVotes));
      must(await sb.from("kpis").insert(seed.kpis.map((k, i) => ({ ...k, improvement_id: i === 0 ? ims[0]?.id ?? null : null, team_id: team.id, activity_id: act("kpis").id, participant_id: who(i) }))));
      must(await sb.from("team_journey_summaries").insert({ team_id: team.id, ...seed.pitch, updated_by: people[0].id }));
      must(
        await sb.from("team_activity_states").insert(
          acts.slice(0, ti === 2 ? 9 : 11).map((a) => ({ team_id: team.id, activity_id: a.id, status: "done", updated_by: people[0].id })),
        ),
      );
    }

    const last = acts[acts.length - 1];
    must(await sb.from("activities").update({ status: "completed" }).eq("session_id", sessionId).neq("id", last.id));
    must(await sb.from("activities").update({ status: "active" }).eq("id", last.id));
    must(await sb.from("classroom_sessions").update({ status: "live", current_activity_id: last.id }).eq("id", sessionId));
    return { id: sessionId };
  } catch (e) {
    return { id: sessionId, error: e instanceof Error ? e.message : String(e) };
  }
}
