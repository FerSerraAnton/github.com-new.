"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical, Plus, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { DEFAULT_CASE } from "@/lib/config/activities";
import { createSession, deleteSession } from "@/lib/data/teacher";
import { createDemoSession } from "@/lib/data/demo";
import { firstError, sessionSchema } from "@/lib/domain/validation";
import { friendlyError } from "@/lib/domain/errors";
import type { ClassroomSession } from "@/lib/types";
import { Alert, Badge, Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui/primitives";
import { BrandMark, DemoBadge } from "@/components/ui/brand";
import { SignOutButton } from "./SignOutButton";
import { formatDate } from "@/lib/utils";

const STATUS = { draft: { label: "Preparada", tone: "neutral" }, live: { label: "En curso", tone: "success" }, finished: { label: "Finalizada", tone: "dark" } } as const;

export function TeacherHome({ name }: { name: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ClassroomSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_CASE, max_per_team: 5, team_count: 4 });
  const [busy, setBusy] = useState<"create" | "demo" | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("classroom_sessions").select("*").order("created_at", { ascending: false });
    if (error) setError(friendlyError(error));
    else setSessions(data as ClassroomSession[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const msg = firstError(sessionSchema.safeParse(form));
    if (msg) return setError(msg);
    setBusy("create");
    const r = await createSession(form);
    setBusy(null);
    if (r.error || !r.id) return setError(r.error ?? "No se pudo crear la sesión");
    router.push(`/profesor/sesion/${r.id}`);
  };

  const demo = async () => {
    setBusy("demo");
    const r = await createDemoSession();
    setBusy(null);
    if (r.error) setError(`Demo creada con errores: ${r.error}`);
    if (r.id) router.push(`/profesor/sesion/${r.id}`);
  };

  return (
    <div className="min-h-dvh">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark light />
          <SignOutButton />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
          <p className="text-sm font-semibold text-white/60">Hola, {name}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Tus sesiones de clase</h1>
        </div>
      </header>

      <main className="mx-auto -mt-6 grid max-w-6xl gap-6 px-4 pb-16 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          {!sessions ? (
            <Card>
              <Spinner />
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-lg font-bold text-navy-900">Aún no tienes sesiones</p>
              <p className="mt-1 text-sm text-muted">Crea tu primera clase con el formulario o prueba una sesión de demostración.</p>
            </Card>
          ) : (
            sessions.map((s) => (
              <Card key={s.id} className="flex items-center gap-4 p-4 transition hover:shadow-lift">
                <div className="grid h-14 w-20 shrink-0 place-items-center rounded-xl bg-sky font-mono text-lg font-bold tracking-widest text-navy-900">{s.code}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                    {s.is_demo && <DemoBadge />}
                  </div>
                  <p className="mt-1 truncate font-bold text-navy-900">{s.title}</p>
                  <p className="text-xs text-muted">
                    {s.company} · {formatDate(s.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${s.title}`}
                  onClick={async () => {
                    if (!confirm(`¿Eliminar «${s.title}» y todas sus respuestas? No se puede deshacer.`)) return;
                    const e = await deleteSession(s.id);
                    if (e) setError(e);
                    void load();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
                <Link href={`/profesor/sesion/${s.id}`} className="inline-flex h-10 items-center gap-1 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
                  Abrir <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-navy-900">
              <Plus className="h-5 w-5 text-brand" /> Crear una clase
            </h2>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <Field label="Título de la actividad" htmlFor="t">
                <Input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140} />
              </Field>
              <Field label="Empresa analizada" htmlFor="c">
                <Input id="c" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Caso práctico / escenario" htmlFor="sc">
                <Textarea id="sc" value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} rows={3} maxLength={2000} />
              </Field>
              <Field label="Instrucciones generales" htmlFor="ins">
                <Textarea id="ins" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} maxLength={2000} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nº de equipos" htmlFor="nt">
                  <Input id="nt" type="number" min={1} max={20} value={form.team_count} onChange={(e) => setForm({ ...form, team_count: Number(e.target.value) })} />
                </Field>
                <Field label="Máx. alumnos por equipo" htmlFor="mx">
                  <Input id="mx" type="number" min={1} max={50} value={form.max_per_team} onChange={(e) => setForm({ ...form, max_per_team: Number(e.target.value) })} />
                </Field>
              </div>
              <p className="text-xs text-muted">Se cargan las 12 actividades del caso (120 min). Podrás editar textos, tiempos y diapositivas desde la sesión.</p>
              <Button type="submit" size="lg" className="w-full" loading={busy === "create"}>
                Crear sesión
              </Button>
            </form>
          </Card>
          <Card className="border-fuchsia-200 p-5">
            <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
              <FlaskConical className="h-5 w-5 text-fuchsia-600" /> Sesión de demostración
            </h2>
            <p className="mt-1 text-sm text-muted">Crea una clase con 3 equipos y respuestas ficticias (marcadas como DEMO) para revisar el panel, el mapa y las exportaciones.</p>
            <Button className="mt-3" variant="secondary" loading={busy === "demo"} onClick={demo}>
              Crear demo
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
