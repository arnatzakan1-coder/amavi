"use server";
// Formulas are confidential: only perfumers and administrators can create, read or change
// ingredient combinations. Customers see a formula's name and can reorder it.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { currentUser, isStaffRole } from "@/lib/session";
import type { ValidationError } from "@/lib/composition";
import { validateOnServer } from "@/lib/formulas";

const itemSchema = z.object({ slug: z.string().min(1).max(64), parts: z.number().int(), tier: z.enum(["TOP", "HEART", "BASE"]) });
const saveSchema = z.object({
  id: z.string().max(64).nullable().optional(),
  bookingId: z.string().max(64).nullable().optional(),
  name: z.string().trim().min(1).max(60),
  eventSlug: z.string().max(64).nullable().optional(),
  concentrationPct: z.number().int(),
  items: z.array(itemSchema).min(1).max(30),
});

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "AUTH" | "INPUT" | "NOT_FOUND" | "NO_CLIENT" }
  | { ok: false; reason: "RULES"; errors: ValidationError[] };

export async function saveFormula(input: unknown): Promise<SaveResult> {
  const staff = await currentUser();
  if (!staff || !isStaffRole(staff.role)) return { ok: false, reason: "AUTH" };
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
    const [existing] = await db.select({ id: s.formulas.id }).from(s.formulas).where(eq(s.formulas.id, formulaId));
    if (!existing) return { ok: false, reason: "NOT_FOUND" };
    await db
      .update(s.formulas)
      .set({ name: data.name, eventSlug, concentrationPct: data.concentrationPct, updatedAt: new Date() })
      .where(eq(s.formulas.id, formulaId));
    await db.delete(s.formulaItems).where(eq(s.formulaItems.formulaId, formulaId));
  } else {
    // A new formula always belongs to the client of a studio booking.
    if (!data.bookingId) return { ok: false, reason: "NO_CLIENT" };
    const [booking] = await db.select().from(s.bookings).where(eq(s.bookings.id, data.bookingId));
    if (!booking) return { ok: false, reason: "NO_CLIENT" };
    const [row] = await db
      .insert(s.formulas)
      .values({
        userId: booking.userId,
        name: data.name,
        eventSlug,
        concentrationPct: data.concentrationPct,
        createdById: staff.id,
        bookingId: booking.id,
      })
      .returning({ id: s.formulas.id });
    formulaId = row.id;
  }

  await db.insert(s.formulaItems).values(
    items.map((i) => ({ formulaId: formulaId!, noteId: noteId.get(i.slug)!, parts: i.parts, tier: i.tier })),
  );
  revalidatePath("/formulas");
  revalidatePath("/admin/formulas");
  revalidatePath("/admin/bookings");
  return { ok: true, id: formulaId };
}

export async function deleteFormula(id: string) {
  const staff = await currentUser();
  if (!staff || staff.role !== "ADMIN") return { ok: false };
  await db.delete(s.formulaItems).where(eq(s.formulaItems.formulaId, id));
  await db.delete(s.formulas).where(eq(s.formulas.id, id));
  revalidatePath("/formulas");
  revalidatePath("/admin/formulas");
  return { ok: true };
}
