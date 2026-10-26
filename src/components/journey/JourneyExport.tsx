"use client";
import { FileDown, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { bundleToCsvRows, bundleToJson, downloadText, slugify, toCsv } from "@/lib/domain/export";
import type { SessionBundle } from "@/lib/types";
import { Button } from "@/components/ui/primitives";

/**
 * Exportaciones: PDF (vista de impresión → "Guardar como PDF"), CSV y JSON.
 * Con teamId exporta un equipo; sin él, la sesión completa (profesor).
 */
export function JourneyExport({ bundle, teamId, compact }: { bundle: SessionBundle; teamId?: string; compact?: boolean }) {
  const team = teamId ? bundle.teams.find((t) => t.id === teamId) : null;
  const base = slugify(`${bundle.session.company}-${team?.name ?? "sesion-completa"}-${new Date().toISOString().slice(0, 10)}`);
  const printUrl = `/imprimir/${bundle.session.id}${teamId ? `?equipo=${teamId}` : ""}`;
  const size = compact ? "sm" : "md";

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button size={size} variant="primary" onClick={() => window.open(`${printUrl}${teamId ? "&" : "?"}pdf=1`, "_blank", "noopener")}>
        <FileDown className="h-4 w-4" /> Descargar PDF
      </Button>
      <Button size={size} variant="secondary" onClick={() => downloadText(`${base}.csv`, toCsv(bundleToCsvRows(bundle, teamId)), "text/csv;charset=utf-8")}>
        <FileSpreadsheet className="h-4 w-4" /> CSV
      </Button>
      <Button size={size} variant="secondary" onClick={() => downloadText(`${base}.json`, JSON.stringify(bundleToJson(bundle, teamId), null, 2), "application/json")}>
        <FileJson className="h-4 w-4" /> JSON
      </Button>
      <Button size={size} variant="ghost" onClick={() => window.open(printUrl, "_blank", "noopener")}>
        <Printer className="h-4 w-4" /> Modo impresión
      </Button>
    </div>
  );
}
