import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase, teacherEmailAllowed } from "@/lib/supabase/server";

const body = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

/**
 * Alta de profesor: solo para correos incluidos en TEACHER_EMAILS.
 * Se ejecuta en servidor con la service role key (nunca llega al navegador).
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  if (!teacherEmailAllowed(email)) {
    return NextResponse.json({ error: "Este correo no está autorizado como profesor (TEACHER_EMAILS)." }, { status: 403 });
  }
  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 500 });
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: exists ? "Ya existe una cuenta con ese correo: inicia sesión." : error.message },
      { status: exists ? 409 : 500 },
    );
  }
  await admin.from("teachers").upsert({ user_id: data.user.id, name: email.split("@")[0] }, { onConflict: "user_id" });
  return NextResponse.json({ ok: true });
}
