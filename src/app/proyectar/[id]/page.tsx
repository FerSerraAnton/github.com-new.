import type { Metadata } from "next";
import { requireTeacher } from "@/lib/supabase/teacher-guard";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { SetupNotice } from "@/components/ui/SetupNotice";

export const metadata: Metadata = { title: "Proyectar resultados" };
export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requireTeacher();
  if (!g.ok) return <SetupNotice />;
  return <PresentationMode sessionId={id} />;
}
