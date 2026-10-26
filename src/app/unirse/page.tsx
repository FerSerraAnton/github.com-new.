import type { Metadata } from "next";
import { SessionJoin } from "@/components/student/SessionJoin";
import { SetupNotice } from "@/components/ui/SetupNotice";

export const metadata: Metadata = { title: "Unirse a la clase" };

export default function JoinPage() {
  return (
    <>
      <SetupNotice />
      <SessionJoin />
    </>
  );
}
