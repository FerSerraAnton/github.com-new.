import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/server";
import { fetchBundle } from "@/lib/data/repo";
import { ReadOnlyView } from "@/components/journey/ReadOnlyView";

export const metadata: Metadata = { title: "Customer Journey · solo lectura", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Enlace de solo lectura: solo funciona si el profesor lo ha activado (share_enabled).
 * Se resuelve en servidor; nunca se envían user_id, token ni alias de alumnos.
 */
export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = getAdminSupabase();
  if (!admin || !/^[a-f0-9]{32}$/.test(token)) notFound();
  const { data: s } = await admin.from("classroom_sessions").select("id, share_enabled").eq("share_token", token).maybeSingle();
  if (!s?.share_enabled) notFound();

  const bundle = await fetchBundle(admin, { sessionId: s.id });
  bundle.session = { ...bundle.session, share_token: "", teacher_id: "" };
  bundle.participants = bundle.participants.map((p, i) => ({ ...p, user_id: null, alias: `Participante ${i + 1}` }));
  return <ReadOnlyView bundle={bundle} />;
}
