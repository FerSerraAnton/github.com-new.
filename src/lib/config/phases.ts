export type PhaseKey = "descubrimiento" | "consideracion" | "compra" | "retencion" | "recomendacion";

export interface PhaseDef {
  key: PhaseKey;
  position: number;
  name: string;
  shortName: string;
  color: string;
  /** Fondo suave para tarjetas */
  tint: string;
  icon: "search" | "scale" | "shopping-bag" | "repeat" | "megaphone";
  description: string;
}

/** Espejo de la tabla journey_phases (se usa para pintar sin esperar a la red). */
export const PHASES: PhaseDef[] = [
  { key: "descubrimiento", position: 1, name: "Descubrimiento", shortName: "Descubrir", color: "#0E9FB8", tint: "#E6F6F9", icon: "search", description: "Aparece la necesidad y el cliente busca soluciones." },
  { key: "consideracion", position: 2, name: "Consideración", shortName: "Considerar", color: "#6D5BD0", tint: "#EFEDFB", icon: "scale", description: "Compara alternativas, resuelve dudas y decide qué opción le conviene." },
  { key: "compra", position: 3, name: "Compra", shortName: "Comprar", color: "#E08A00", tint: "#FDF3E1", icon: "shopping-bag", description: "Elige canal, método y completa la transacción." },
  { key: "retencion", position: 4, name: "Retención / Experiencia", shortName: "Experiencia", color: "#12946B", tint: "#E5F5EF", icon: "repeat", description: "Usa el producto, interactúa con la marca y valora si repetiría." },
  { key: "recomendacion", position: 5, name: "Recomendación", shortName: "Recomendar", color: "#D9475F", tint: "#FBE9EC", icon: "megaphone", description: "Comparte su experiencia y se convierte (o no) en prescriptor." },
];

export const PHASE_BY_KEY: Record<PhaseKey, PhaseDef> = Object.fromEntries(
  PHASES.map((p) => [p.key, p]),
) as Record<PhaseKey, PhaseDef>;

export function isPhaseKey(v: unknown): v is PhaseKey {
  return typeof v === "string" && v in PHASE_BY_KEY;
}
