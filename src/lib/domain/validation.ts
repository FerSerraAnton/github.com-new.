import { z } from "zod";

const phase = z.enum(["descubrimiento", "consideracion", "compra", "retencion", "recomendacion"], {
  message: "Elige una fase del recorrido",
});
const level = z.enum(["baja", "media", "alta"], { message: "Elige un nivel" });
const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label}: escribe algo` : `${label}: al menos ${min} caracteres`)
    .max(max, `${label}: máximo ${max} caracteres`);
const optional = (max: number, label: string) => z.string().trim().max(max, `${label}: máximo ${max} caracteres`);

export const aliasSchema = text(1, 40, "Nombre o alias");
export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,10}$/, "El código tiene entre 4 y 10 letras o números");

export const contributionSchema = text(1, 2000, "Respuesta");

export const touchpointSchema = z.object({
  channel: text(1, 60, "Canal"),
  channel_type: z.enum(["digital", "fisico"]),
  description: optional(500, "Descripción"),
});

export const emotionSchema = z.object({
  value: z.number({ message: "Elige un emoji" }).int().min(1, "Elige un emoji").max(5),
  reason: text(3, 600, "¿Por qué se siente así?"),
});

export const frictionSchema = z.object({
  title: text(2, 120, "Título"),
  description: optional(1000, "Descripción"),
  phase_key: phase,
  severity: level,
  customer_impact: text(2, 600, "Consecuencia para el cliente"),
  business_impact: text(2, 600, "Consecuencia para la empresa"),
});

export const improvementSchema = z.object({
  friction_id: z.string().uuid().nullable(),
  problem: text(2, 600, "Problema"),
  solution: text(2, 1000, "Solución propuesta"),
  channel: optional(80, "Canal"),
  phase_key: phase,
  benefit: text(2, 600, "Beneficio esperado"),
  priority: level,
});

export const kpiSchema = z.object({
  name: text(2, 80, "Nombre del KPI"),
  is_custom: z.boolean(),
  measure_what: text(2, 600, "Qué queremos medir"),
  phase_key: phase,
  data_source: text(2, 300, "Fuente de datos"),
  decision: text(2, 600, "Qué decisión podríamos tomar"),
  improvement_id: z.string().uuid().nullable(),
});

export const sessionSchema = z.object({
  title: text(1, 140, "Título"),
  company: text(1, 80, "Empresa"),
  scenario: text(10, 2000, "Escenario"),
  instructions: optional(2000, "Instrucciones"),
  max_per_team: z.number().int().min(1, "Mínimo 1").max(50, "Máximo 50"),
  team_count: z.number().int().min(1, "Al menos un equipo").max(20, "Máximo 20 equipos"),
});

/** Devuelve el primer mensaje de error legible o null. */
export function firstError(result: { success: boolean; error?: z.ZodError }) {
  if (result.success || !result.error) return null;
  return result.error.issues[0]?.message ?? "Revisa los campos";
}
