import "server-only";
import { redirect } from "next/navigation";
import { getAdminSupabase, getServerSupabase, teacherEmailAllowed } from "./server";

export type TeacherGuard =
  | { ok: true; teacherId: string; email: string | null; name: string }
  | { ok: false; reason: "not_configured" | "not_teacher"; email: string | null };

/**
 * Comprueba en servidor que la sesión pertenece a un profesor.
 * Si el correo está en TEACHER_EMAILS y aún no tiene fila en `teachers`, se la crea (service role).
 */
export async function requireTeacher(): Promise<TeacherGuard> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, reason: "not_configured", email: null };
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) redirect("/profesor/login");

  const { data: t } = await sb.from("teachers").select("id, name").eq("user_id", user.id).maybeSingle();
  if (t) return { ok: true, teacherId: t.id, email: user.email ?? null, name: t.name };

  if (teacherEmailAllowed(user.email)) {
    const admin = getAdminSupabase();
    if (admin) {
      const { data: created } = await admin
        .from("teachers")
        .upsert({ user_id: user.id, name: (user.email ?? "Profesor").split("@")[0] }, { onConflict: "user_id" })
        .select("id, name")
        .single();
      if (created) return { ok: true, teacherId: created.id, email: user.email ?? null, name: created.name };
    }
  }
  return { ok: false, reason: "not_teacher", email: user.email ?? null };
}
