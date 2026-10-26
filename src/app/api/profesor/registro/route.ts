import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const body = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  code: z.string().trim().min(4, "Escribe el código de invitación").max(20),
});

const MESSAGES: Record<string, [string, number]> = {
  TEACHER_NOT_ALLOWED: ["Correo o código de invitación no válidos (o el código ya se usó).", 403],
  TEACHER_EXISTS: ["Ya existe una cuenta con ese correo: inicia sesión.", 409],
  WEAK_PASSWORD: ["La contraseña debe tener al menos 8 caracteres.", 400],
};

/**
 * Alta de profesor. La comprobación de la lista de correos autorizados y la creación
 * de la cuenta (ya confirmada) se hacen en la base de datos (RPC register_teacher).
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos" }, { status: 400 });
  }
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  const { error } = await sb.rpc("register_teacher", { p_email: parsed.data.email, p_password: parsed.data.password, p_code: parsed.data.code });
  if (error) {
    const hit = Object.entries(MESSAGES).find(([code]) => error.message.includes(code));
    const [msg, status] = hit ? hit[1] : [error.message, 500];
    return NextResponse.json({ error: msg }, { status });
  }
  return NextResponse.json({ ok: true });
}
