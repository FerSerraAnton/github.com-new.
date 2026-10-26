import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "./server";

export type TeacherGuard =
  | { ok: true; teacherId: string; email: string | null; name: string }
  | { ok: false; reason: "not_configured" | "not_teacher"; email: string | null };

/** Comprueba en servidor que la sesión pertenece a un profesor autorizado. */
export async function requireTeacher(): Promise<TeacherGuard> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, reason: "not_configured", email: null };
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/profesor/login");

  let { data: t } = await sb.from("teachers").select("id, name").eq("user_id", user.id).maybeSingle();
  if (!t) {
    // Cuenta existente cuyo correo se añadió después a la lista de autorizados.
    await sb.rpc("claim_teacher");
    ({ data: t } = await sb.from("teachers").select("id, name").eq("user_id", user.id).maybeSingle());
  }
  if (t) return { ok: true, teacherId: t.id, email: user.email ?? null, name: t.name };
  return { ok: false, reason: "not_teacher", email: user.email ?? null };
}
