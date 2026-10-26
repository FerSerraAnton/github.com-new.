const MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: "No encontramos ninguna clase con ese código. Revisa que esté bien escrito.",
  SESSION_FINISHED: "Esta clase ya ha terminado. Pide al profesor un nuevo código.",
  SESSION_FULL: "Todos los equipos están completos. Avisa al profesor para que amplíe el límite.",
  TEAM_FULL: "Ese equipo ya está completo. Elige otro o usa la asignación automática.",
  TEAM_NOT_FOUND: "Ese equipo ya no existe. Recarga la página.",
  INVALID_ALIAS: "Escribe un nombre o alias de 1 a 40 caracteres.",
  NOT_AUTHENTICATED: "No hemos podido iniciar tu sesión. Recarga la página e inténtalo de nuevo.",
  NOT_TEACHER: "Tu cuenta no tiene permisos de profesor.",
  NOT_ALLOWED: "No tienes permiso para hacer esto.",
};

/** Traduce errores de Supabase/Postgres a mensajes comprensibles. */
export function friendlyError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  for (const [code, msg] of Object.entries(MESSAGES)) if (raw.includes(code)) return msg;
  if (/row-level security|permission denied/i.test(raw)) {
    return "Esta actividad no está abierta ahora mismo (o no pertenece a tu equipo). Espera a que el profesor la active.";
  }
  if (/duplicate key/i.test(raw)) return "Ya existe un registro igual.";
  if (/violates check constraint/i.test(raw)) return "Algún campo es demasiado corto o demasiado largo.";
  if (/Failed to fetch|NetworkError|network/i.test(raw)) return "Sin conexión. Tus cambios se guardarán cuando vuelva la red.";
  if (/anonymous sign-ins are disabled/i.test(raw)) {
    return "El acceso de alumnos sin registro no está activado en Supabase (Authentication → Anonymous sign-ins).";
  }
  return raw || "Algo no ha ido bien. Inténtalo de nuevo.";
}
