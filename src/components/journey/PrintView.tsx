"use client";
import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import { useLiveBundle } from "@/hooks/use-live-bundle";
import { Alert, Button, Spinner } from "@/components/ui/primitives";
import { BrandMark } from "@/components/ui/brand";
import { JourneyDocument } from "./JourneyDocument";

/**
 * Vista de impresión. Con ?pdf=1 abre directamente el diálogo del navegador
 * («Guardar como PDF»), sin servicios externos.
 */
export function PrintView({ sessionId, teamId, autoPrint }: { sessionId: string; teamId?: string; autoPrint?: boolean }) {
  const { bundle, error } = useLiveBundle({ sessionId, teamId: teamId ?? null });
  const printed = useRef(false);

  useEffect(() => {
    if (!bundle || !autoPrint || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, [bundle, autoPrint]);

  if (!bundle) return error ? <Alert tone="error" className="m-8">{error}</Alert> : <Spinner label="Preparando el documento…" />;
  const teams = teamId ? bundle.teams.filter((t) => t.id === teamId) : bundle.teams.filter((t) => bundle.work.contributions.some((c) => c.team_id === t.id) || bundle.participants.some((p) => p.team_id === t.id));

  return (
    <div className="mx-auto max-w-[1280px] bg-canvas px-4 py-6 print:max-w-none print:bg-white print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
        <BrandMark />
        <p className="text-sm text-muted">Para obtener el PDF elige «Guardar como PDF» en el diálogo de impresión (horizontal, con gráficos de fondo).</p>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>
      {teams.length === 0 && <Alert tone="info">No hay trabajo que mostrar todavía.</Alert>}
      {teams.map((t, i) => (
        <div key={t.id} className={i > 0 ? "print-break mt-12 print:mt-0" : ""}>
          <JourneyDocument bundle={bundle} team={t} />
        </div>
      ))}
      <p className="mt-10 text-center text-xs text-muted">UAX Journey Lab · Digital Business Intelligence · Universidad Alfonso X el Sabio</p>
    </div>
  );
}
