import type { Metadata } from "next";
import { PrintView } from "@/components/journey/PrintView";

export const metadata: Metadata = { title: "Customer Journey · impresión" };

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ equipo?: string; pdf?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return <PrintView sessionId={id} teamId={sp.equipo} autoPrint={sp.pdf === "1"} />;
}
