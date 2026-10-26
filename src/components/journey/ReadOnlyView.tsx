"use client";
import { useState } from "react";
import type { SessionBundle } from "@/lib/types";
import { Tabs } from "@/components/ui/primitives";
import { BrandMark, DemoBadge } from "@/components/ui/brand";
import { TeamComparison } from "@/components/presentation/TeamComparison";
import { JourneyDocument } from "./JourneyDocument";

/** Enlace público de solo lectura autorizado por el profesor (sin alias de alumnos). */
export function ReadOnlyView({ bundle }: { bundle: SessionBundle }) {
  const [view, setView] = useState<string>(bundle.teams[0]?.id ?? "comparar");
  const team = bundle.teams.find((t) => t.id === view);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <BrandMark />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-navy-900">{bundle.session.title}</p>
            <p className="text-xs text-muted">Vista de solo lectura</p>
          </div>
          {bundle.session.is_demo && <DemoBadge />}
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <Tabs value={view} onChange={setView} items={[...bundle.teams.map((t) => ({ value: t.id, label: t.name })), { value: "comparar", label: "Comparativa" }]} />
        {team ? <JourneyDocument bundle={bundle} team={team} hideAuthors /> : <TeamComparison bundle={bundle} />}
      </main>
    </div>
  );
}
