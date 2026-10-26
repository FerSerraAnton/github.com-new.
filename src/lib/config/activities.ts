import type { PhaseKey } from "./phases";

/**
 * Configuración por defecto del ejercicio (caso Decathlon).
 * Al crear una sesión se copia a la tabla `activities`, donde el profesor puede
 * editar textos, tiempos y diapositivas sin tocar el código.
 */

export type ActivityKind = "welcome" | "need" | "phase" | "emotions" | "frictions" | "improvements" | "kpis" | "pitch";

/** Fila del mapa final a la que alimenta un campo */
export type MapRow = "actions" | "needs" | "context";

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  row: MapRow;
  type?: "text" | "choice";
  options?: string[];
}

export interface ActivityConfig {
  fields?: FieldDef[];
  touchpoints?: { label: string; min?: number };
  emotion?: boolean;
  minItems?: number;
  examples?: string[];
}

export interface ActivityTemplate {
  position: number;
  key: string;
  kind: ActivityKind;
  phase_key: PhaseKey | null;
  title: string;
  objective: string;
  instructions: string;
  question: string;
  example: string;
  recommended_minutes: number;
  slide_number: string;
  config: ActivityConfig;
}

export const DEFAULT_CASE = {
  title: "Customer Journey · Caso práctico Decathlon",
  subtitle: "Construyendo la experiencia del cliente",
  company: "Decathlon",
  scenario:
    "Una persona quiere empezar a correr y necesita comprar unas zapatillas de running. No tiene experiencia previa, desconoce qué características debe buscar y quiere tomar una buena decisión sin gastar demasiado.",
  instructions:
    "Analizad todo su recorrido: desde que identifica la necesidad hasta que usa el producto y recomienda (o no) la experiencia. Método: pensar → escribir → contrastar → decidir. Cada equipo entrega una conclusión.",
};

export const DEFAULT_ACTIVITIES: ActivityTemplate[] = [
  {
    position: 1, key: "acceso", kind: "welcome", phase_key: null,
    title: "Acceso y organización de equipos",
    objective: "Formar los equipos y conocer el reto.",
    instructions: "Comprobad que todo el equipo está dentro. Leed juntos el caso y la regla: cada equipo entrega una conclusión.",
    question: "¿Estáis todos? Leed el caso antes de empezar.",
    example: "", recommended_minutes: 10, slide_number: "20", config: {},
  },
  {
    position: 2, key: "necesidad", kind: "need", phase_key: null,
    title: "Entender la necesidad",
    objective: "Identificar qué dispara el viaje del cliente, antes del momento de pagar.",
    instructions: "1 minuto en silencio: cada uno escribe su frase. Después contrastad en el equipo y marcad con ⭐ las dos mejores explicaciones.",
    question: "¿Qué provoca que nuestro cliente necesite comprar unas zapatillas de running?",
    example: "«El viaje comienza cuando un compañero de trabajo le propone apuntarse a una carrera popular de 5 km».",
    recommended_minutes: 10, slide_number: "21",
    config: {
      fields: [
        { key: "inicio", label: "El viaje comienza cuando…", placeholder: "Piensa en la necesidad, no en el momento de pagar", row: "context" },
        { key: "situacion", label: "Situación inicial", placeholder: "¿Cómo es su día a día antes de correr?", row: "context" },
        { key: "necesidad", label: "Necesidad", placeholder: "¿Qué necesita realmente?", row: "needs" },
        { key: "problema", label: "Problema que quiere resolver", placeholder: "Ej.: no sabe qué zapatilla le conviene", row: "needs" },
        { key: "objetivo", label: "Objetivo que persigue", placeholder: "Ej.: correr sin lesionarse gastando poco", row: "needs" },
        { key: "origen", label: "¿La necesidad aparece por iniciativa propia o por un estímulo externo?", row: "context", type: "choice", options: ["Iniciativa propia", "Estímulo externo", "Ambas"] },
      ],
    },
  },
  {
    position: 3, key: "descubrimiento", kind: "phase", phase_key: "descubrimiento",
    title: "Descubrimiento",
    objective: "Describir cómo encuentra el cliente las posibles soluciones.",
    instructions: "Escribid una acción concreta del cliente (verbo + acción observable). Añadid los puntos de contacto que usa y valorad cómo se siente.",
    question: "¿Cómo descubre el cliente las posibles soluciones?",
    example: "Busca en Google «zapatillas running principiante» y ve un vídeo comparativo en YouTube.",
    recommended_minutes: 13, slide_number: "22–24",
    config: {
      fields: [
        { key: "acciones", label: "Qué hace", placeholder: "Verbo + acción observable", row: "actions" },
        { key: "informacion", label: "Qué información busca", placeholder: "Tipos de pisada, precios, tallas…", row: "needs" },
        { key: "expectativas", label: "Qué espera encontrar", placeholder: "Una recomendación clara y sencilla…", row: "needs" },
      ],
      touchpoints: { label: "¿Qué canales utiliza?", min: 1 },
      emotion: true,
    },
  },
  {
    position: 4, key: "consideracion", kind: "phase", phase_key: "consideracion",
    title: "Consideración",
    objective: "Entender cómo compara alternativas y qué pesa en su decisión.",
    instructions: "Pensad qué compara y qué le hace decidir. Una frase por idea.",
    question: "¿Cómo compara las diferentes alternativas?",
    example: "Compara dos modelos de Kalenji con unas Nike en un marketplace y lee opiniones sobre durabilidad.",
    recommended_minutes: 13, slide_number: "23",
    config: {
      fields: [
        { key: "acciones", label: "Acciones del cliente", placeholder: "Compara, lee, pregunta…", row: "actions" },
        { key: "alternativas", label: "Alternativas que considera", placeholder: "Marcas, tiendas, modelos…", row: "actions" },
        { key: "informacion", label: "Información que necesita", placeholder: "Amortiguación, talla, garantía…", row: "needs" },
        { key: "dudas", label: "Dudas que pueden surgir", placeholder: "¿Qué talla? ¿Puedo devolverlas?", row: "needs" },
        { key: "factores", label: "Factores que influyen en su decisión", placeholder: "Precio, opiniones, consejo del vendedor…", row: "needs" },
      ],
      touchpoints: { label: "Canales consultados", min: 1 },
      emotion: true,
    },
  },
  {
    position: 5, key: "compra", kind: "phase", phase_key: "compra",
    title: "Compra",
    objective: "Describir el momento de compra y sus posibles obstáculos.",
    instructions: "Debate A/B: ¿anuncio → web → compra, o busca online → prueba en tienda → compara → compra en web? Aportad una razón, no una opinión general.",
    question: "¿Qué sucede cuando decide comprar?",
    example: "Se prueba dos tallas en tienda, pero acaba comprando en la web porque hay su color.",
    recommended_minutes: 13, slide_number: "25",
    config: {
      fields: [
        { key: "modalidad", label: "¿La compra es online, presencial o una combinación?", row: "actions", type: "choice", options: ["Online", "Presencial", "Combinación de ambas"] },
        { key: "acciones", label: "Acciones necesarias", placeholder: "Elegir talla, pagar, elegir envío…", row: "actions" },
        { key: "metodo", label: "Método de compra", placeholder: "Pago con tarjeta, recogida en tienda…", row: "actions" },
        { key: "informacion", label: "Información consultada", placeholder: "Stock, plazos, política de cambios…", row: "needs" },
        { key: "expectativas", label: "Expectativas", placeholder: "Pago rápido, entrega en 48 h…", row: "needs" },
        { key: "obstaculos", label: "Posibles obstáculos", placeholder: "Colas, sin stock de su talla…", row: "needs" },
      ],
      touchpoints: { label: "Canal de compra", min: 1 },
      emotion: true,
    },
  },
  {
    position: 6, key: "retencion", kind: "phase", phase_key: "retencion",
    title: "Retención y experiencia",
    objective: "Analizar qué ocurre después de comprar y al usar el producto.",
    instructions: "Pensad en las primeras salidas a correr y en cualquier contacto posterior con Decathlon.",
    question: "¿Qué ocurre después de comprar y comenzar a utilizar las zapatillas?",
    example: "Tras la tercera salida le molesta el talón y entra en la app para ver si puede cambiarlas.",
    recommended_minutes: 13, slide_number: "23",
    config: {
      fields: [
        { key: "primera_experiencia", label: "Primera experiencia con el producto", placeholder: "Primera salida, comodidad…", row: "actions" },
        { key: "interacciones", label: "Interacciones posteriores con Decathlon", placeholder: "Email, app, valoración, tienda…", row: "actions" },
        { key: "recompra", label: "Posibilidades de recompra", placeholder: "Calcetines, ropa técnica, segunda zapatilla…", row: "actions" },
        { key: "expectativas_cumplidas", label: "Expectativas cumplidas o incumplidas", placeholder: "¿Qué se cumplió y qué no?", row: "needs" },
        { key: "necesidades_atencion", label: "Necesidades de atención", placeholder: "Cambios, consejos de uso, garantía…", row: "needs" },
      ],
      touchpoints: { label: "Puntos de contacto tras la compra", min: 0 },
      emotion: true,
    },
  },
  {
    position: 7, key: "recomendacion", kind: "phase", phase_key: "recomendacion",
    title: "Recomendación",
    objective: "Descubrir qué convierte al cliente en prescriptor de la marca.",
    instructions: "¿Repite o recomienda? Justificad con un hecho del recorrido.",
    question: "¿Qué tendría que suceder para que el cliente recomendase Decathlon?",
    example: "Termina su primera carrera de 5 km sin molestias y lo comenta en un grupo de WhatsApp de corredores.",
    recommended_minutes: 13, slide_number: "23",
    config: {
      fields: [
        { key: "experiencia_final", label: "Experiencia final", placeholder: "¿Cómo termina el recorrido?", row: "actions" },
        { key: "fidelizacion", label: "Posibilidades de fidelización", placeholder: "Programa de socios, comunidad runner…", row: "actions" },
        { key: "motivos", label: "Motivos para recomendar", placeholder: "Relación calidad-precio, buen consejo…", row: "needs" },
        { key: "insatisfaccion", label: "Factores que pueden generar insatisfacción", placeholder: "Durabilidad, mala atención…", row: "needs" },
      ],
      touchpoints: { label: "Canales de recomendación", min: 1 },
      emotion: true,
    },
  },
  {
    position: 8, key: "mapa_emocional", kind: "emotions", phase_key: null,
    title: "Revisión del mapa emocional",
    objective: "Acordar la emoción representativa de cada fase y leer la curva.",
    instructions: "Revisad los votos de cada fase y elegid la emoción del equipo. No hay respuesta única: justificad con un hecho del recorrido.",
    question: "¿Cómo se siente el cliente en cada fase del viaje?",
    example: "Consideración 😟: demasiados modelos y no entiende las diferencias de amortiguación.",
    recommended_minutes: 11, slide_number: "27", config: {},
  },
  {
    position: 9, key: "fricciones", kind: "frictions", phase_key: null,
    title: "Identificación de fricciones",
    objective: "Detectar dónde puede fallar la experiencia y qué consecuencias tiene.",
    instructions: "Identificad al menos tres puntos de fricción. Para cada uno: fase, gravedad y consecuencias para el cliente y para Decathlon.",
    question: "¿Dónde puede fallar la experiencia del cliente?",
    example: "Descubrimiento: no sabe qué tipo de zapatilla necesita. Consideración: no entiende tallas, diferencias o plazos. Poscompra: no sabe si puede cambiar el producto.",
    recommended_minutes: 11, slide_number: "26", config: { minItems: 3 },
  },
  {
    position: 10, key: "mejoras", kind: "improvements", phase_key: null,
    title: "Propuestas de mejora",
    objective: "Pasar de la fricción a una mejora real (mini consultoría).",
    instructions: "Detectar → proponer → demostrar. Proponed al menos tres mejoras concretas en web, tienda o atención y votad las que más os convenzan.",
    question: "¿Qué podría hacer Decathlon para mejorar la experiencia?",
    example: "Un test de pisada de 3 preguntas en la ficha de producto que recomiende un modelo y una talla.",
    recommended_minutes: 5, slide_number: "28", config: { minItems: 3 },
  },
  {
    position: 11, key: "kpis", kind: "kpis", phase_key: null,
    title: "Medición y KPIs",
    objective: "Definir cómo sabríamos si las mejoras funcionan.",
    instructions: "Elegid al menos un KPI que pruebe vuestra mejora principal y justificad por qué. Son propuestas de medición, no resultados reales de Decathlon.",
    question: "¿Cómo sabríamos si las mejoras funcionan?",
    example: "Tasa de devoluciones por talla en la fase de experiencia, a partir del registro de devoluciones.",
    recommended_minutes: 4, slide_number: "29", config: { minItems: 1 },
  },
  {
    position: 12, key: "pitch", kind: "pitch", phase_key: null,
    title: "Presentación y conclusiones",
    objective: "Defender una decisión en 30 segundos.",
    instructions: "Completad las tres frases del pitch. Si nadie habla, se leen las frases escritas.",
    question: "Detectamos ___ en la fase ___. Proponemos ___ porque ___. Lo mediremos con ___.",
    example: "", recommended_minutes: 4, slide_number: "30–32", config: {},
  },
];

/** Actividades que cuentan para el porcentaje de progreso de un equipo. */
export function countsForProgress(kind: ActivityKind) {
  return kind !== "welcome";
}
