import { supabaseEnv } from "@/lib/supabase/env";

/** Aviso claro cuando faltan las variables de Supabase (no se simula el backend). */
export function SetupNotice() {
  if (supabaseEnv().configured) return null;
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900" role="alert">
      <p className="font-bold">Falta conectar Supabase</p>
      <p className="mt-1 text-sm">
        Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ver README → «Puesta en marcha»). Sin
        base de datos la aplicación no funciona: no usa datos simulados.
      </p>
    </div>
  );
}
