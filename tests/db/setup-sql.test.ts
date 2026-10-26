import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

describe("supabase/setup.sql", () => {
  it("se puede ejecutar dos veces seguidas (idempotente)", async () => {
    const db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
    const sql = readFileSync("supabase/setup.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    const r = await db.query<{ n: number }>("select count(*)::int n from public.journey_phases");
    expect(r.rows[0].n).toBe(5);
  });
});
