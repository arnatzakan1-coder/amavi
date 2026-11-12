import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { evaluate, withFixedNotes } from "./composition";
import { getConcentrations, getNotes, getPairs, getSetting, toRule } from "./data";

/** Loads everything needed to validate a formula on the server. */
export async function validateOnServer(items: { slug: string; parts: number; tier: "TOP" | "HEART" | "BASE" }[], concentrationPct: number) {
  const [notes, rules, pairs, concs] = await Promise.all([getNotes(), getSetting("rules"), getPairs(), getConcentrations()]);
  const rulesList = notes.map(toRule);
  const fixed = withFixedNotes(items, rulesList);
  const result = evaluate(fixed, rulesList, rules, pairs, concentrationPct, concs.map((c) => c.pct));
  return { result, notes, items: fixed };
}

export async function getFormulasForUser(userId: string, onlyIds?: string[]) {
  const where = onlyIds?.length
    ? and(eq(s.formulas.userId, userId), inArray(s.formulas.id, onlyIds))
    : eq(s.formulas.userId, userId);
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
