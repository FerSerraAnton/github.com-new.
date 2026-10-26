"use client";
import { CloudOff, Check, Loader2, PenLine, AlertTriangle, Megaphone, Repeat, Scale, Search, ShoppingBag, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { PHASE_BY_KEY, type PhaseKey } from "@/lib/config/phases";
import { useSaveState } from "@/lib/data/save-store";
import { formatClock, type TimerState } from "@/hooks/use-timer";
import type { Connection } from "@/hooks/use-live-bundle";
import { cn } from "@/lib/utils";

/** Identificación textual de UAX (no reproduce el logotipo oficial). */
export function BrandMark({ compact, href = "/", light }: { compact?: boolean; href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="UAX Journey Lab, inicio">
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl text-[13px] font-extrabold tracking-tight", light ? "bg-white text-navy-900" : "bg-navy-900 text-white")}>
        UAX
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className={cn("block text-[15px] font-extrabold tracking-tight", light ? "text-white" : "text-navy-900")}>Journey Lab</span>
          <span className={cn("block text-[11px] font-medium", light ? "text-white/70" : "text-muted")}>Digital Business Intelligence</span>
        </span>
      )}
    </Link>
  );
}

const ICONS = { search: Search, scale: Scale, "shopping-bag": ShoppingBag, repeat: Repeat, megaphone: Megaphone };

export function PhaseIcon({ phase, className }: { phase: PhaseKey; className?: string }) {
  const Icon = ICONS[PHASE_BY_KEY[phase].icon];
  return <Icon className={className} aria-hidden />;
}

export function PhaseChip({ phase, className }: { phase: PhaseKey; className?: string }) {
  const p = PHASE_BY_KEY[phase];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", className)} style={{ background: p.tint, color: p.color }}>
      <PhaseIcon phase={phase} className="h-3.5 w-3.5" />
      {p.name}
    </span>
  );
}

/** Guardando… / Guardado / Sin conexión / Cambios pendientes */
export function SaveStatus({ connection }: { connection?: Connection }) {
  const s = useSaveState();
  const offline = !s.online || connection === "offline";
  let icon = <Check className="h-4 w-4 text-emerald-600" />;
  let text = "Guardado";
  if (offline) {
    icon = <CloudOff className="h-4 w-4 text-amber-600" />;
    text = s.drafts ? "Sin conexión · cambios pendientes" : "Sin conexión";
  } else if (s.inflight > 0) {
    icon = <Loader2 className="h-4 w-4 animate-spin text-brand" />;
    text = "Guardando…";
  } else if (s.lastError) {
    icon = <AlertTriangle className="h-4 w-4 text-red-600" />;
    text = "No se pudo guardar";
  } else if (s.drafts) {
    icon = <PenLine className="h-4 w-4 text-amber-600" />;
    text = "Cambios pendientes de enviar";
  } else if (!s.lastSavedAt) {
    text = "Todo al día";
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted" role="status" aria-live="polite" title={s.lastError ?? undefined}>
      {icon}
      {text}
    </span>
  );
}

export function ConnectionDot({ connection }: { connection: Connection }) {
  const map = {
    online: { Icon: Wifi, text: "En directo", cls: "text-emerald-700 bg-emerald-50" },
    connecting: { Icon: Loader2, text: "Conectando…", cls: "text-muted bg-canvas" },
    offline: { Icon: WifiOff, text: "Reconectando…", cls: "text-amber-800 bg-amber-50" },
  }[connection];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", map.cls)} role="status">
      <map.Icon className={cn("h-3.5 w-3.5", connection === "connecting" && "animate-spin")} aria-hidden />
      {map.text}
    </span>
  );
}

export function OfflineBanner({ connection }: { connection: Connection }) {
  if (connection !== "offline") return null;
  return (
    <div className="no-print sticky top-0 z-40 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900" role="alert">
      Se ha perdido la conexión. Lo que escribas se guarda en este dispositivo y se sincronizará al volver.
    </div>
  );
}

export function TimerPill({ timer, minutes, large }: { timer: TimerState; minutes?: number; large?: boolean }) {
  if (timer.remaining === null) {
    return minutes ? <span className="text-sm font-medium text-muted">{minutes} min recomendados</span> : null;
  }
  const low = timer.remaining <= 60;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono font-bold tabular-nums",
        large ? "px-4 py-2 text-2xl" : "px-3 py-1 text-sm",
        timer.expired ? "bg-red-50 text-red-700" : low ? "bg-amber-50 text-amber-800" : "bg-sky text-navy-900",
      )}
      role="timer"
      aria-label={timer.expired ? "Tiempo cumplido" : `Quedan ${formatClock(timer.remaining)}`}
    >
      ⏱ {timer.expired ? `Tiempo · ${formatClock(timer.remaining)}` : formatClock(timer.remaining)}
      {timer.paused && <span className="font-sans text-xs font-semibold">(pausa)</span>}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300 bg-fuchsia-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-fuchsia-800">
      Datos de demostración
    </span>
  );
}
