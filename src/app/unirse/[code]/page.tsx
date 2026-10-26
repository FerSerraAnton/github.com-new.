import type { Metadata } from "next";
import { SessionJoin } from "@/components/student/SessionJoin";
import { SetupNotice } from "@/components/ui/SetupNotice";

export const metadata: Metadata = { title: "Unirse a la clase" };

export default async function JoinWithCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <SetupNotice />
      <SessionJoin initialCode={decodeURIComponent(code).toUpperCase()} />
    </>
  );
}
