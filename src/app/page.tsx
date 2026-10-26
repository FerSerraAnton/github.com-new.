import Link from "next/link";
import { ArrowRight, GraduationCap, Presentation, Smile } from "lucide-react";
import { BrandMark } from "@/components/ui/brand";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { PHASES } from "@/lib/config/phases";
import { EMOTIONS } from "@/lib/config/catalogs";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_600px_at_0%_-20%,#d6e6fa,transparent),radial-gradient(900px_500px_at_110%_0%,#ebe6fb,transparent)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Link href="/profesor" className="text-sm font-semibold text-navy-800 hover:text-brand">
            Acceso profesor
          </Link>
        </header>
        <SetupNotice />

        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">Digital Business Intelligence · UAX</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-navy-900 sm:text-6xl">
              Construyendo la experiencia del cliente
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/75">
              Un laboratorio en directo para mapear, en equipo, cada paso del viaje del cliente: acciones, puntos de contacto, emociones,
              fricciones, mejoras y KPIs.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/unirse" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-navy-900 px-8 text-lg font-bold text-white shadow-lift transition hover:bg-navy-800">
                <GraduationCap className="h-5 w-5" /> Soy estudiante <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/profesor" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-line bg-white px-8 text-lg font-bold text-navy-900 shadow-card transition hover:border-brand-light">
                <Presentation className="h-5 w-5" /> Soy profesor
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white/80 p-5 shadow-lift backdrop-blur">
            <p className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-900">
              <Smile className="h-4 w-4 text-brand" /> El viaje en cinco fases
            </p>
            <ol className="space-y-2.5">
              {PHASES.map((p, i) => (
                <li key={p.key} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: p.tint }}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold text-white" style={{ background: p.color }}>
                    {p.position}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-navy-900">{p.name}</span>
                    <span className="block text-xs text-muted">{p.description}</span>
                  </span>
                  <span className="emoji text-2xl" aria-hidden>
                    {EMOTIONS[[3, 1, 2, 4, 4][i]].emoji}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
