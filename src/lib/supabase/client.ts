"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null = null;

/** Cliente de navegador único (sesión persistida en cookies, compartida con el servidor). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, key } = supabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase no está configurado: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  client = createBrowserClient(url, key);
  return client;
}
