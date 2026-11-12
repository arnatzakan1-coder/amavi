"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { currentUser } from "@/lib/session";
import type { ValidationError } from "@/lib/composition";
import { validateOnServer, getFormulasForUser } from "@/lib/formulas";

const itemSchema = z.object({ slug: z.string().min(1).max(64), parts: z.number().int(), tier: z.enum(["TOP", "HEART", "BASE"]) });
const saveSchema = z.object({
  id: z.string().max(64).nullable().optional(),
  name: z.string().trim().min(1).max(60),
  eventSlug: z.string().max(64).nullable().optional(),
  concentrationPct: z.number().int(),
  items: z.array(itemSchema).min(1).max(30),
});

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "AUTH" | "INPUT" | "NOT_FOUND" }
  | { ok: false; reason: "RULES"; errors: ValidationError[] };

export async function saveFormula(input: unknown): Promise<SaveResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "AUTH" };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "INPUT" };
  const data = parsed.data;

  const { result, notes, items, concentrationPct } = await validateOnServer(data.items, data.concentrationPct);
  data.concentrationPct = concentrationPct;
  if (!result.ok) return { ok: false, reason: "RULES", errors: result.errors };

  const noteId = new Map(notes.map((n) => [n.slug, n.id]));
  let eventSlug = data.eventSlug ?? null;
  if (eventSlug) {
    const [ev] = await db.select({ id: s.eventCategories.id }).from(s.eventCategories).where(eq(s.eventCategories.slug, eventSlug));
    if (!ev) eventSlug = null;
  }

  let formulaId = data.id ?? null;
  if (formulaId) {
    const [own] = await db
      .select({ id: s.formulas.id })
      .from(s.formulas)
      .where(and(eq(s.formulas.id, formulaId), eq(s.formulas.userId, user.id)));
    if (!own) return { ok: false, reason: "NOT_FOUND" };
    await db
      .update(s.formulas)
      .set({ name: data.name, eventSlug, concentrationPct: data.concentrationPct, updatedAt: new Date() })
      .where(eq(s.formulas.id, formulaId));
    await db.delete(s.formulaItems).where(eq(s.formulaItems.formulaId, formulaId));
  } else {
    const [row] = await db
      .insert(s.formulas)
      .values({ userId: user.id, name: data.name, eventSlug, concentrationPct: data.concentrationPct })
      .returning({ id: s.formulas.id });
    formulaId = row.id;
  }

  await db.insert(s.formulaItems).values(
    items.map((i) => ({ formulaId: formulaId!, noteId: noteId.get(i.slug)!, parts: i.parts, tier: i.tier })),
  );
  revalidatePath("/formulas");
  return { ok: true, id: formulaId };
}

export async function deleteFormula(id: string) {
  const user = await currentUser();
  if (!user) return { ok: false };
  await db.delete(s.formulas).where(and(eq(s.formulas.id, id), eq(s.formulas.userId, user.id)));
  revalidatePath("/formulas");
  return { ok: true };
}

export async function renameFormula(id: string, name: string) {
  const user = await currentUser();
  const n = z.string().trim().min(1).max(60).safeParse(name);
  if (!user || !n.success) return { ok: false };
  await db
    .update(s.formulas)
    .set({ name: n.data, updatedAt: new Date() })
    .where(and(eq(s.formulas.id, id), eq(s.formulas.userId, user.id)));
  revalidatePath("/formulas");
  return { ok: true };
}

/** Formulas of the current user, with items resolved to slugs. Never returns other users' data. */
export async function listMyFormulas() {
  const user = await currentUser();
  if (!user) return [];
  return getFormulasForUser(user.id);
}
