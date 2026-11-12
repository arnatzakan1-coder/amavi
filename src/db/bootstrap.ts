// Runs once when the server starts (see src/instrumentation.ts):
// 1) applies SQL migrations from /drizzle, 2) loads AMAVI's data if the database is empty.
// This lets a fresh hosted database (e.g. Turso on Vercel) work with no manual commands.
import path from "node:path";
import { eq, ne } from "drizzle-orm";
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
  await applyDataUpdates();
}

// ───────── One-time data updates for databases that already exist ─────────
// Each step runs once; the applied version is stored in the `setting` table.
const DATA_UPDATES: { version: number; run: () => Promise<void> }[] = [
  {
    // 2026-11-12: team prices, single 15% concentration, new phone, no area on the site.
    version: 2,
    run: async () => {
      await db.update(s.volumes).set({ priceKzt: 9990 }).where(eq(s.volumes.ml, 10));
      await db.update(s.volumes).set({ priceKzt: 21990 }).where(eq(s.volumes.ml, 30));
      await patchSetting("giftSet", { priceKzt: 21990 });
      await patchSetting("boutique", { phone: "+77765518509", whatsapp: "77765518509", areaM2: null });
      await db.update(s.concentrations).set({ active: false, isDefault: false }).where(ne(s.concentrations.pct, 15));
      await db
        .insert(s.concentrations)
        .values({ pct: 15, isDefault: true, active: true, surchargeKzt: 0 })
        .onConflictDoUpdate({ target: s.concentrations.pct, set: { isDefault: true, active: true } });
    },
  },
];

async function patchSetting(key: string, patch: Record<string, unknown>) {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, key));
  if (!row) return;
  const value = { ...JSON.parse(row.value), ...patch };
  await db.update(s.settings).set({ value: JSON.stringify(value) }).where(eq(s.settings.key, key));
}

async function applyDataUpdates() {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, "dataVersion"));
  let current = row ? Number(row.value) || 1 : 1;
  for (const u of DATA_UPDATES) {
    if (u.version <= current) continue;
    await u.run();
    current = u.version;
    await db
      .insert(s.settings)
      .values({ key: "dataVersion", value: String(current) })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: String(current) } });
    console.log(`[amavi] applied data update v${current}`);
  }
}
