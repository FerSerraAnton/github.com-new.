// Une todas las migraciones en supabase/setup.sql para pegarlas de una vez en el SQL Editor de Supabase.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const out = files.map((f) => `-- >>> ${f}\n${readFileSync(`${dir}/${f}`, "utf8")}`).join("\n\n");
writeFileSync("supabase/setup.sql", `-- UAX Journey Lab · instalación completa (generado con npm run db:bundle)\n-- Pegar en Supabase → SQL Editor → Run. Es idempotente: se puede ejecutar más de una vez.\n\n${out}`);
console.log(`supabase/setup.sql ← ${files.join(", ")}`);
