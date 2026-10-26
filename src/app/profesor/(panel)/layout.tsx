import Link from "next/link";
import { requireTeacher } from "@/lib/supabase/teacher-guard";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { SignOutButton } from "@/components/teacher/SignOutButton";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireTeacher();
  if (!guard.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <SetupNotice />
        {guard.reason === "not_teacher" && (
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h1 className="text-xl font-extrabold text-navy-900">Acceso restringido al profesorado</h1>
            <p className="mt-2 text-sm text-muted">
              La cuenta <b>{guard.email}</b> no tiene permisos de profesor. Añade el correo a la tabla{" "}
              <code>teacher_allowlist</code> de Supabase y vuelve a entrar.
            </p>
            <div className="mt-4 flex gap-2">
              <SignOutButton />
              <Link href="/" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-navy-800 hover:bg-sky">
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
