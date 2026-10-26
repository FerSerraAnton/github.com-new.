"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Shuffle, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { aliasSchema, codeSchema, firstError } from "@/lib/domain/validation";
import { friendlyError } from "@/lib/domain/errors";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui/primitives";
import { BrandMark, DemoBadge } from "@/components/ui/brand";
import { cn } from "@/lib/utils";

interface PublicSession {
  id: string;
  code: string;
  title: string;
  company: string;
  scenario: string;
  status: "draft" | "live" | "finished";
  max_per_team: number;
  is_demo: boolean;
  teams: { id: string; name: string; color: string; count: number }[];
}

/** Garantiza una sesión anónima de Supabase (sin registro, sin correo). */
async function ensureAnonymousUser() {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user) return data.user;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signed.user!;
}

export function SessionJoin({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [alias, setAlias] = useState("");
  const [session, setSession] = useState<PublicSession | null>(null);
  const [teamId, setTeamId] = useState<string | "auto">("auto");
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (c: string) => {
    const parsed = codeSchema.safeParse(c);
    const msg = firstError(parsed);
    if (msg || !parsed.success) return setError(msg);
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb.rpc("get_session_by_code", { p_code: parsed.data });
      if (error) throw error;
      if (!data) throw new Error("SESSION_NOT_FOUND");
      const s = data as PublicSession;
      setSession(s);
      // ¿Ya estaba dentro (recarga / vuelve a abrir el enlace)? → directo al laboratorio.
      const { data: u } = await sb.auth.getUser();
      if (u.user) {
        const { data: mine } = await sb.from("participants").select("id, alias").eq("session_id", s.id).eq("user_id", u.user.id).maybeSingle();
        if (mine) {
          router.replace(`/lab/${s.code}`);
          return;
        }
      }
      try {
        setAlias(localStorage.getItem("ujl:alias") ?? "");
      } catch {}
    } catch (e) {
      setSession(null);
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) void lookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const join = async () => {
    const msg = firstError(aliasSchema.safeParse(alias));
    if (msg) return setError(msg);
    if (!session) return;
    setJoining(true);
    setError(null);
    try {
      await ensureAnonymousUser();
      const { error } = await getSupabase().rpc("join_session", {
        p_code: session.code,
        p_alias: alias.trim(),
        p_team_id: teamId === "auto" ? null : teamId,
      });
      if (error) throw error;
      try {
        localStorage.setItem("ujl:alias", alias.trim());
      } catch {}
      router.push(`/lab/${session.code}`);
    } catch (e) {
      setError(friendlyError(e));
      void lookup(session.code); // refrescar plazas libres
      setJoining(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_500px_at_10%_-10%,#dbe9fb,transparent),radial-gradient(900px_400px_at_110%_10%,#e9e4fb,transparent)]">
      <div className="mx-auto flex max-w-xl flex-col px-4 py-8">
        <BrandMark />
        <div className="mt-10 animate-rise">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand">Customer Journey en directo</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">Bienvenido a UAX Journey Lab</h1>
          <p className="mt-2 text-lg text-ink/75">Hoy vas a construir un Customer Journey real junto a tu equipo.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-lift sm:p-6">
          {loading ? (
            <Spinner label="Buscando la clase…" />
          ) : !session ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(code);
              }}
              className="space-y-4"
            >
              <Field label="Código de clase" htmlFor="code" hint="Lo verás en la pantalla del aula o en el QR">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoComplete="off"
                  inputMode="text"
                  placeholder="ABC123"
                  className="h-14 text-center font-mono text-2xl font-bold tracking-[0.3em]"
                  maxLength={10}
                />
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Continuar <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void join();
              }}
              className="space-y-5"
            >
              <div className="rounded-xl bg-navy-900 p-4 text-white">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Clase {session.code}</p>
                  {session.is_demo && <DemoBadge />}
                </div>
                <p className="mt-1 font-extrabold">{session.title}</p>
                <p className="mt-1 text-sm text-white/75">
                  Empresa analizada: <b className="text-white">{session.company}</b>
                </p>
              </div>

              {session.status === "finished" ? (
                <Alert tone="warning">Esta clase ya ha terminado.</Alert>
              ) : (
                <>
                  <Field label="Tu nombre o alias" htmlFor="alias" hint="Solo lo verán tu equipo y el profesor. No hace falta correo ni contraseña.">
                    <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={40} autoComplete="nickname" placeholder="Ej.: Lucía M." autoFocus />
                  </Field>

                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-navy-900">Elige equipo</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <TeamOption selected={teamId === "auto"} onClick={() => setTeamId("auto")} color="#0A2A52" title="Asignación automática" subtitle="Te colocamos en el equipo con menos personas" icon={<Shuffle className="h-4 w-4" />} />
                      {session.teams.map((t) => {
                        const full = t.count >= session.max_per_team;
                        return (
                          <TeamOption
                            key={t.id}
                            selected={teamId === t.id}
                            disabled={full}
                            onClick={() => setTeamId(t.id)}
                            color={t.color}
                            title={t.name}
                            subtitle={full ? "Completo" : `${t.count} de ${session.max_per_team} plazas ocupadas`}
                            icon={<Users className="h-4 w-4" />}
                          />
                        );
                      })}
                    </div>
                  </fieldset>

                  <Button type="submit" variant="hero" size="xl" className="w-full" loading={joining}>
                    ENTRAR AL LABORATORIO <ArrowRight className="h-5 w-5" />
                  </Button>
                </>
              )}
              <button type="button" onClick={() => (setSession(null), setError(null))} className="w-full cursor-pointer text-center text-sm text-muted hover:text-brand">
                Usar otro código
              </button>
            </form>
          )}
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Solo guardamos tu alias y tus respuestas de clase. Nada más.</p>
      </div>
    </div>
  );
}

function TeamOption({ selected, disabled, onClick, color, title, subtitle, icon }: { selected: boolean; disabled?: boolean; onClick: () => void; color: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
        selected ? "shadow-card" : "border-line enabled:hover:border-brand-light/50",
      )}
      style={selected ? { borderColor: color, background: `${color}0d` } : undefined}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: color }}>
        {icon}
      </span>
      <span>
        <span className="block font-bold text-navy-900">{title}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}
