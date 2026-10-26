import type { PhaseKey } from "./phases";

export interface EmotionLevel {
  value: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  label: string;
  /** Equivalencia con el "termómetro" de la diapositiva 27 (−2 … +2) */
  thermometer: number;
  color: string;
}

export const EMOTIONS: EmotionLevel[] = [
  { value: 1, emoji: "😡", label: "Muy negativo", thermometer: -2, color: "#C62E3F" },
  { value: 2, emoji: "😟", label: "Negativo", thermometer: -1, color: "#E2742B" },
  { value: 3, emoji: "😐", label: "Neutral", thermometer: 0, color: "#8A94A6" },
  { value: 4, emoji: "🙂", label: "Positivo", thermometer: 1, color: "#3C9D5D" },
  { value: 5, emoji: "😍", label: "Muy positivo", thermometer: 2, color: "#0F8A6C" },
];

export function emotionFor(value: number | null | undefined): EmotionLevel | null {
  if (!value) return null;
  return EMOTIONS.find((e) => e.value === Math.round(value)) ?? null;
}

export type ChannelType = "digital" | "fisico";

export interface ChannelDef {
  name: string;
  type: ChannelType;
}

/** Canales seleccionables (enunciado + diapositiva 24: canales digitales y físicos). */
export const CHANNELS: ChannelDef[] = [
  { name: "Google", type: "digital" },
  { name: "Redes sociales", type: "digital" },
  { name: "YouTube", type: "digital" },
  { name: "Recomendaciones", type: "fisico" },
  { name: "Publicidad", type: "digital" },
  { name: "Web de la empresa", type: "digital" },
  { name: "Ficha de producto", type: "digital" },
  { name: "Opiniones y reseñas", type: "digital" },
  { name: "App", type: "digital" },
  { name: "Correo electrónico", type: "digital" },
  { name: "Tienda física", type: "fisico" },
  { name: "Exposición / lineal", type: "fisico" },
  { name: "Probador", type: "fisico" },
  { name: "Vendedor", type: "fisico" },
  { name: "Caja", type: "fisico" },
  { name: "Entrega", type: "fisico" },
  { name: "Devolución", type: "fisico" },
];

export const SEVERITIES = [
  { value: "baja", label: "Baja", dot: "🟢", color: "#2F9E5B" },
  { value: "media", label: "Media", dot: "🟠", color: "#E08A00" },
  { value: "alta", label: "Alta", dot: "🔴", color: "#D23A3A" },
] as const;
export type Severity = (typeof SEVERITIES)[number]["value"];

export const PRIORITIES = SEVERITIES;

export interface KpiDef {
  name: string;
  phases: PhaseKey[];
  hint: string;
}

/** Catálogo de KPIs (propuestas de medición, nunca resultados reales). */
export const KPI_CATALOG: KpiDef[] = [
  { name: "Visitas web", phases: ["descubrimiento", "consideracion"], hint: "Sesiones en web o fichas de producto." },
  { name: "CTR", phases: ["descubrimiento"], hint: "Clics / impresiones de anuncios o resultados de búsqueda." },
  { name: "Tasa de conversión", phases: ["compra"], hint: "Compras / visitas o visitas a ficha." },
  { name: "Abandono del carrito", phases: ["compra"], hint: "Carritos no finalizados / carritos creados." },
  { name: "Tiempo de permanencia", phases: ["consideracion"], hint: "Tiempo medio en ficha o guía de compra." },
  { name: "Consultas de atención al cliente", phases: ["consideracion", "retencion"], hint: "Volumen y motivo de las consultas." },
  { name: "Satisfacción del cliente", phases: ["retencion"], hint: "Encuesta CSAT tras la compra o el uso." },
  { name: "NPS", phases: ["recomendacion"], hint: "Probabilidad de recomendar (0–10)." },
  { name: "Tasa de recompra", phases: ["retencion"], hint: "Clientes que vuelven a comprar en un periodo." },
  { name: "Retención", phases: ["retencion"], hint: "Clientes activos tras X meses." },
  { name: "Valoración de reseñas", phases: ["recomendacion"], hint: "Nota media y volumen de reseñas." },
  { name: "Tasa de devoluciones", phases: ["retencion"], hint: "Productos devueltos / vendidos (diapositiva 29)." },
  { name: "Ticket medio", phases: ["compra"], hint: "Importe medio por compra (diapositiva 29)." },
];

export const TEAM_COLORS = ["#0A5FB4", "#0E9FB8", "#6D5BD0", "#E08A00", "#12946B", "#D9475F", "#3A4D8F", "#B8572A"];
