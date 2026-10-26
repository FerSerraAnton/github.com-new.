"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/domain/errors";
import { useLiveBundle } from "@/hooks/use-live-bundle";
import { Alert, Button, Spinner } from "@/components/ui/primitives";
import { StudentDashboard } from "./StudentDashboard";

/**
 * Recupera la participación del alumno (tras recargar o volver a abrir el enlace)
 * y monta el laboratorio sincronizado en tiempo real.
 */
export function LabLoader({ code }: { code: string }) {
  const router = useRouter();
  const [ids, setIds] = useState<{ sessionId: string; teamId: string | null; userId: string } | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data: u } = await sb.auth.getUser();
        if (!u.user) return router.replace(`/unirse/${code}`);
        const { data: s, error } = await sb.rpc("get_session_by_code", { p_code: code });
        if (error) throw error;
        if (!s) throw new Error("SESSION_NOT_FOUND");
        const { data: me, error: e2 } = await sb
          .from("participants")
          .select("id, team_id")
          .eq("session_id", (s as { id: string }).id)
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (e2) throw e2;
        if (!me) return router.replace(`/unirse/${code}`);
        if (!cancelled) setIds({ sessionId: (s as { id: string }).id, teamId: me.team_id, userId: u.user.id });
      } catch (e) {
        if (!cancelled) setFatal(friendlyError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  const live = useLiveBundle(ids ? { sessionId: ids.sessionId, teamId: ids.teamId } : null);

  // Si el profesor cambia al alumno de equipo, seguirle al nuevo equipo.
  const meNow = live.bundle?.participants.find((p) => p.user_id === ids?.userId);
  useEffect(() => {
    if (ids && meNow && meNow.team_id !== ids.teamId) setIds({ ...ids, teamId: meNow.team_id });
  }, [meNow?.team_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fatal) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert tone="error">{fatal}</Alert>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/unirse")}>
          Volver a unirse
        </Button>
      </div>
    );
  }
  if (!ids || !live.bundle) {
    return live.error ? (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert tone="error">{live.error}</Alert>
        <Button className="mt-4" onClick={() => live.reload()}>
          Reintentar
        </Button>
      </div>
    ) : (
      <Spinner label="Entrando en el laboratorio…" />
    );
  }
  if (!meNow) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert tone="warning">Ya no figuras en esta clase. Vuelve a unirte con el código.</Alert>
        <Button className="mt-4" onClick={() => router.push(`/unirse/${code}`)}>
          Unirme de nuevo
        </Button>
      </div>
    );
  }
  if (!meNow.team_id || !live.bundle.teams.some((t) => t.id === meNow.team_id) || meNow.team_id !== ids.teamId) {
    return <Spinner label={meNow.team_id ? "Cambiando de equipo…" : "Esperando a que el profesor te asigne un equipo…"} />;
  }
  return <StudentDashboard bundle={live.bundle} userId={ids.userId} connection={live.connection} />;
}
