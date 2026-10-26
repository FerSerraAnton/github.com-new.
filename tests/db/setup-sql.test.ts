import { describe, expect, it } from "vitest";
import { createTestDb } from "./harness";
import { readFileSync } from "node:fs";

describe("supabase/setup.sql", () => {
  it("se puede ejecutar dos veces seguidas (idempotente)", async () => {
    const db = await createTestDb(); // ya aplica las migraciones una vez
    await db.exec(readFileSync("supabase/setup.sql", "utf8"));
    await db.exec(readFileSync("supabase/setup.sql", "utf8"));
    const r = await db.query<{ n: number }>("select count(*)::int n from public.journey_phases");
    expect(r.rows[0].n).toBe(5);
  });
});
