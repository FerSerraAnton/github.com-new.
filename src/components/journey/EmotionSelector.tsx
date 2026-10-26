"use client";
import { useRef, type KeyboardEvent } from "react";
import { EMOTIONS } from "@/lib/config/catalogs";
import { cn } from "@/lib/utils";

/**
 * Selector de emociones grande y accesible (radiogroup): flechas para moverse,
 * cada emoji con su etiqueta textual visible y como tooltip.
 */
export function EmotionSelector({
  value,
  onChange,
  disabled,
  size = "lg",
  label = "Estado emocional del cliente",
}: {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(4, idx + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, idx - 1);
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(EMOTIONS[next].value);
  };
  const focusIdx = value ? value - 1 : 2;

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
      {EMOTIONS.map((e, i) => {
        const selected = value === e.value;
        return (
          <button
            key={e.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${e.label} (${e.value} de 5)`}
            title={`${e.label} · valor ${e.value}`}
            tabIndex={i === focusIdx ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(e.value)}
            onKeyDown={(ev) => onKey(ev, i)}
            className={cn(
              "group flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 bg-white transition-all disabled:cursor-not-allowed disabled:opacity-60",
              size === "lg" ? "px-1 py-3 sm:py-4" : "px-1 py-2",
              selected ? "-translate-y-0.5 shadow-lift" : "border-line hover:-translate-y-0.5 hover:border-brand-light/50",
            )}
            style={selected ? { borderColor: e.color, background: `${e.color}12` } : undefined}
          >
            <span className={cn("emoji transition-transform", size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl", selected ? "animate-pop" : "grayscale-[35%] group-hover:grayscale-0")} aria-hidden>
              {e.emoji}
            </span>
            <span className={cn("text-center font-semibold leading-tight", size === "lg" ? "text-[11px] sm:text-xs" : "text-[10px]")} style={{ color: selected ? e.color : undefined }}>
              {e.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
