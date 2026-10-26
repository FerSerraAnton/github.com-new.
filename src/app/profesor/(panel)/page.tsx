import type { Metadata } from "next";
import { requireTeacher } from "@/lib/supabase/teacher-guard";
import { TeacherHome } from "@/components/teacher/TeacherHome";

export const metadata: Metadata = { title: "Panel del profesor" };

export default async function TeacherPage() {
  const g = await requireTeacher();
  return <TeacherHome name={g.ok ? g.name : ""} />;
}
