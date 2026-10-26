import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ReadOnlyView } from "@/components/journey/ReadOnlyView";
import type { SessionBundle } from "@/lib/types";

export const metadata: Metadata = { title: "Customer Journey · solo lectura", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Enlace de solo lectura: la base de datos solo lo devuelve si el profesor lo activó
 * (share_enabled) y ya sin token, ids de usuario ni alias reales.
 */
export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await getServerSupabase();
  if (!sb || !/^[a-f0-9]{32}$/.test(token)) notFound();
  const { data } = await sb.rpc("get_shared_session", { p_token: token });
  if (!data) notFound();
  const bundle = data as SessionBundle;
  bundle.session = { ...bundle.session, share_token: "", teacher_id: "" };
  return <ReadOnlyView bundle={bundle} />;
}
