import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { evaluate, withFixedNotes } from "./composition";
import { getConcentrations, getNotes, getPairs, getSetting, toRule } from "./data";

/** A concentration that is no longer offered (e.g. a formula saved at 20% after the shop
 *  switched to a single 20% option) is moved to the current default instead of failing. */
export function pickConcentration(pct: number, concs: { pct: number; isDefault: boolean }[]): number {
  if (concs.some((c) => c.pct === pct)) return pct;
  return concs.find((c) => c.isDefault)?.pct ?? concs[0]?.pct ?? pct;
}

export async function resolveConcentration(pct: number) {
  return pickConcentration(pct, await getConcentrations());
}

/** Loads everything needed to validate a formula on the server. */
export async function validateOnServer(items: { slug: string; parts: number; tier: "TOP" | "HEART" | "BASE" }[], requestedPct: number) {
  const [notes, rules, pairs, concs] = await Promise.all([getNotes(), getSetting("rules"), getPairs(), getConcentrations()]);
  const concentrationPct = pickConcentration(requestedPct, concs);
  const rulesList = notes.map(toRule);
  const fixed = withFixedNotes(items, rulesList);
  const result = evaluate(fixed, rulesList, rules, pairs, concentrationPct, concs.map((c) => c.pct));
  return { result, notes, items: fixed, concentrationPct };
}

/** STAFF / SERVER USE ONLY — returns ingredient lists. Never pass `items` to a customer page. */
export async function getFormulasForUser(userId: string | null, onlyIds?: string[]) {
  const conds = [];
  if (userId) conds.push(eq(s.formulas.userId, userId));
  if (onlyIds?.length) conds.push(inArray(s.formulas.id, onlyIds));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(s.formulas).where(where);
  if (rows.length === 0) return [];
  const items = await db
    .select({ formulaId: s.formulaItems.formulaId, parts: s.formulaItems.parts, tier: s.formulaItems.tier, slug: s.notes.slug })
    .from(s.formulaItems)
    .innerJoin(s.notes, eq(s.notes.id, s.formulaItems.noteId))
    .where(inArray(s.formulaItems.formulaId, rows.map((r) => r.id)));
  return rows
    .sort((a, b) => +b.updatedAt - +a.updatedAt)
    .map((r) => ({
      ...r,
      items: items.filter((i) => i.formulaId === r.id).map((i) => ({ slug: i.slug, parts: i.parts, tier: i.tier as "TOP" | "HEART" | "BASE" })),
    }));
}
