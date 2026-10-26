"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, LayoutGrid, ListChecks, QrCode, Settings, Users } from "lucide-react";
import { useLiveBundle } from "@/hooks/use-live-bundle";
import { usePresence } from "@/hooks/use-presence";
import { useTimer } from "@/hooks/use-timer";
import type { Team } from "@/lib/types";
import { Alert, Button, Card, Spinner, Tabs } from "@/components/ui/primitives";
import { BrandMark, ConnectionDot, DemoBadge, OfflineBanner } from "@/components/ui/brand";
import { JourneyExport } from "@/components/journey/JourneyExport";
import { SessionControls } from "./SessionControls";
import { TeamProgressCard } from "./TeamProgressCard";
import { AccessPanel, ActivitiesPanel, ParticipantsPanel, SettingsPanel, TeamResponsesModal } from "./TeacherPanels";

type Tab = "equipos" | "participantes" | "actividades" | "acceso" | "ajustes" | "exportar";

export function TeacherDashboard({ sessionId }: { sessionId: string }) {
  const { bundle, error, connection, reload } = useLiveBundle({ sessionId });
  const online = usePresence(sessionId, { role: "teacher" });
  const timer = useTimer(bundle?.session ?? null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [openTeam, setOpenTeam] = useState<Team | null>(null);

  if (!bundle) {
    return error ? (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alert tone="error">{error}</Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => reload()}>Reintentar</Button>
          <Link href="/profesor" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-navy-800 hover:bg-sky">Volver</Link>
        </div>
      </div>
    ) : (
      <Spinner label="Cargando la sesión…" />
    );
  }

  const { session, teams, participants } = bundle;
  // Antes de empezar, lo útil es el QR; durante la clase, los equipos.
  const activeTab: Tab = tab ?? (session.status === "draft" ? "acceso" : "equipos");

  return (
    <div className="min-h-dvh pb-16">
      <OfflineBanner connection={connection} />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/profesor" className="rounded-lg p-1.5 text-muted hover:bg-sky hover:text-navy-900" aria-label="Volver a mis sesiones">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BrandMark compact href="/profesor" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-navy-900">{session.title}</p>
            <p className="truncate text-xs text-muted">
              {session.company} · {teams.length} equipos · {participants.length} estudiantes
            </p>
          </div>
          {session.is_demo && <DemoBadge />}
          <span className="rounded-xl bg-sky px-3 py-1.5 font-mono text-lg font-extrabold tracking-[0.2em] text-navy-900" title="Código de clase">
            {session.code}
          </span>
          <ConnectionDot connection={connection} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-5">
        <SessionControls bundle={bundle} timer={timer} />

        <Tabs<Tab>
          value={activeTab}
          onChange={setTab}
          items={[
            { value: "equipos", label: <><LayoutGrid className="h-4 w-4" /> Equipos</> },
            { value: "participantes", label: <><Users className="h-4 w-4" /> Estudiantes ({participants.length})</> },
            { value: "actividades", label: <><ListChecks className="h-4 w-4" /> Actividades</> },
            { value: "acceso", label: <><QrCode className="h-4 w-4" /> Acceso / QR</> },
            { value: "ajustes", label: <><Settings className="h-4 w-4" /> Ajustes</> },
            { value: "exportar", label: <><Download className="h-4 w-4" /> Exportar</> },
          ]}
        />

        {activeTab === "equipos" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {teams.map((t) => (
              <TeamProgressCard key={t.id} bundle={bundle} team={t} online={online} onOpen={() => setOpenTeam(t)} />
            ))}
          </div>
        )}
        {activeTab === "participantes" && <ParticipantsPanel bundle={bundle} online={online} />}
        {activeTab === "actividades" && <ActivitiesPanel bundle={bundle} />}
        {activeTab === "acceso" && (
          <Card className="p-6">
            <AccessPanel code={session.code} />
            <p className="mt-5 text-sm text-muted">
              Consejo: abre <b>Proyectar resultados → Acceso</b> para mostrar el QR a pantalla completa. Los equipos se van llenando en directo en la pestaña «Estudiantes».
            </p>
          </Card>
        )}
        {activeTab === "ajustes" && <SettingsPanel bundle={bundle} />}
        {activeTab === "exportar" && (
          <Card className="space-y-5 p-5">
            <div>
              <h3 className="text-lg font-extrabold text-navy-900">Sesión completa</h3>
              <p className="mb-3 text-sm text-muted">PDF con el Customer Journey de todos los equipos, CSV con todas las respuestas o JSON con la sesión entera.</p>
              <JourneyExport bundle={bundle} />
            </div>
            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-lg font-extrabold text-navy-900">Por equipo</h3>
              <ul className="space-y-3">
                {teams.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex w-40 items-center gap-2 font-bold">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                      {t.name}
                    </span>
                    <JourneyExport bundle={bundle} teamId={t.id} compact />
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </main>
      {openTeam && <TeamResponsesModal bundle={bundle} team={openTeam} onClose={() => setOpenTeam(null)} />}
    </div>
  );
}
