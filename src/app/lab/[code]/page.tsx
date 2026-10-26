import type { Metadata } from "next";
import { LabLoader } from "@/components/student/LabLoader";
import { SetupNotice } from "@/components/ui/SetupNotice";

export const metadata: Metadata = { title: "Laboratorio" };

export default async function LabPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <SetupNotice />
      <LabLoader code={decodeURIComponent(code).toUpperCase()} />
    </>
  );
}
