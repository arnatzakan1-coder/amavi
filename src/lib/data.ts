import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { CompositionRules, NoteRule, Pair } from "./composition";
import type { PriceConfig } from "./pricing";

export type Boutique = {
  addressRu: string;
  addressKk: string;
  addressEn: string;
  areaM2: number | null;
  lat: number | null;
  lon: number | null;
  twoGisUrl: string | null;
  hours: string | null;
  phone: string;
  whatsapp: string;
  listingUrl: string | null;
  leaseSigned: boolean;
};

export type GiftSet = { enabled: boolean; bottles: number; volumeMl: number; priceKzt: number };

const DEFAULTS = {
  rules: { maxNotes: 10, minNotesPerTier: 1, verified: false } as CompositionRules,
  giftSet: { enabled: false, bottles: 3, volumeMl: 10, priceKzt: 0 } as GiftSet,
  boutique: {
    addressRu: "", addressKk: "", addressEn: "", areaM2: null, lat: null, lon: null,
    twoGisUrl: null, hours: null, phone: "+77765518509", whatsapp: "77765518509", listingUrl: null, leaseSigned: false,
  } as Boutique,
};

type SettingKey = keyof typeof DEFAULTS;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const rows = await db.select().from(s.settings).where(eq(s.settings.key, key));
  if (!rows[0]) return DEFAULTS[key];
  try {
    return { ...DEFAULTS[key], ...JSON.parse(rows[0].value) };
  } catch {
    return DEFAULTS[key];
  }
}

export async function setSetting(key: SettingKey, value: unknown) {
  await db
    .insert(s.settings)
    .values({ key, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: JSON.stringify(value) } });
}

export async function getNotes(opts: { activeOnly?: boolean } = {}) {
  const rows = await db.select().from(s.notes).orderBy(asc(s.notes.position));
  return opts.activeOnly ? rows.filter((n) => n.active) : rows;
}

export function toRule(n: typeof s.notes.$inferSelect): NoteRule {
  return {
    slug: n.slug,
    family: n.family,
    tier: n.tier,
    isFixed: n.isFixed,
    fixedParts: n.fixedParts,
    minParts: n.minParts,
    maxParts: n.maxParts,
    maxSharePct: n.maxSharePct,
    active: n.active,
  };
}

export async function getPairs(): Promise<Pair[]> {
  return db.select({ noteA: s.incompatiblePairs.noteA, noteB: s.incompatiblePairs.noteB, reason: s.incompatiblePairs.reason }).from(s.incompatiblePairs);
}

export async function getEvents(activeOnly = true) {
  const rows = await db.select().from(s.eventCategories).orderBy(asc(s.eventCategories.sortOrder));
  return activeOnly ? rows.filter((e) => e.active) : rows;
}

export async function getVolumes(activeOnly = true) {
  const rows = await db.select().from(s.volumes).orderBy(asc(s.volumes.sortOrder));
  return activeOnly ? rows.filter((v) => v.active) : rows;
}

export async function getConcentrations(activeOnly = true) {
  const rows = await db.select().from(s.concentrations).orderBy(asc(s.concentrations.pct));
  return activeOnly ? rows.filter((c) => c.active) : rows;
}

export async function getPriceConfig(): Promise<PriceConfig> {
  const [volumes, concentrations, giftSet] = await Promise.all([getVolumes(false), getConcentrations(false), getSetting("giftSet")]);
  return { volumes, concentrations, giftSet };
}

/** Delivery methods that are active AND have a configured price. */
export async function getDeliveryMethods(all = false) {
  const rows = await db.select().from(s.deliveryMethods).orderBy(asc(s.deliveryMethods.sortOrder));
  return all ? rows : rows.filter((d) => d.active && d.priceKzt != null);
}

export async function getPaymentMethods(all = false) {
  const rows = await db.select().from(s.paymentMethods).orderBy(asc(s.paymentMethods.sortOrder));
  return all ? rows : rows.filter((p) => p.active);
}

export async function getCreatorData() {
  const [notes, rules, pairs, events, concentrations] = await Promise.all([
    getNotes({ activeOnly: true }),
    getSetting("rules"),
    getPairs(),
    getEvents(),
    getConcentrations(),
  ]);
  return { notes, rules, pairs, events, concentrations };
}
