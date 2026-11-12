// Runs once when the server starts (see src/instrumentation.ts):
// 1) applies SQL migrations from /drizzle, 2) loads AMAVI's data if the database is empty.
// This lets a fresh hosted database (e.g. Turso on Vercel) work with no manual commands.
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, schema as s } from "./index";
import { runSeed } from "./seed";

export async function bootstrap() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  try {
    await migrate(db, { migrationsFolder });
  } catch (e) {
    // A database created earlier with `drizzle-kit push` already has the tables but no
    // migration history; in that case continue with the existing schema.
    const msg = String((e as Error)?.message ?? e);
    if (!/already exists/i.test(msg)) throw e;
    console.warn("[amavi] tables already exist, skipping migrations");
  }
  const anyNote = await db.select({ id: s.notes.id }).from(s.notes).limit(1);
  if (anyNote.length === 0) {
    const n = await runSeed();
    console.log(`[amavi] database was empty — loaded ${n} notes and default settings`);
  }
}
