"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/domain/errors";
import { Alert, Button, Field, Input, Tabs } from "@/components/ui/primitives";
import { BrandMark } from "@/components/ui/brand";

export default function TeacherLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "registro") {
        const r = await fetch("/api/profesor/registro", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "No se pudo crear la cuenta");
      }
      const sb = getSupabase();
      // Si el navegador tenía una sesión anónima de alumno, se sustituye por la del profesor.
      await sb.auth.signOut();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(/invalid/i.test(error.message) ? "Correo o contraseña incorrectos." : error.message);
      router.replace("/profesor");
      router.refresh();
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-900 bg-[radial-gradient(900px_500px_at_0%_0%,#154b8a,transparent)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark light />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lift">
          <h1 className="text-2xl font-extrabold text-navy-900">Panel del profesor</h1>
          <p className="mt-1 text-sm text-muted">Acceso protegido. Los estudiantes no necesitan cuenta.</p>
          <Tabs
            className="mt-4"
            value={mode}
            onChange={(v) => (setMode(v), setError(null))}
            items={[
              { value: "login", label: <><LogIn className="h-4 w-4" /> Entrar</> },
              { value: "registro", label: <><UserPlus className="h-4 w-4" /> Crear cuenta</> },
            ]}
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Field label="Correo" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Contraseña" htmlFor="password" hint={mode === "registro" ? "Mínimo 8 caracteres. Solo correos autorizados (TEACHER_EMAILS)." : undefined}>
              <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "registro" ? 8 : 1} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {mode === "login" ? "Entrar" : "Crear cuenta y entrar"}
            </Button>
            {error && <Alert tone="error">{error}</Alert>}
          </form>
        </div>
      </div>
    </div>
  );
}
