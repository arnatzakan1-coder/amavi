"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { currentUser } from "@/lib/session";
import { normalizeKzPhone } from "@/lib/phone";

const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().max(30),
  city: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(120),
  house: z.string().trim().min(1).max(20),
  apartment: z.string().trim().max(20).optional(),
  comment: z.string().trim().max(300).optional(),
});

export type AddressState = { ok?: boolean; error?: string } | undefined;

export async function addAddress(_: AddressState, form: FormData): Promise<AddressState> {
  const user = await currentUser();
  if (!user) return { error: "AUTH" };
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "INPUT" };
  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return { error: "PHONE" };
  const existing = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id));
  if (existing.length >= 10) return { error: "INPUT" };
  await db.insert(s.addresses).values({
    ...parsed.data,
    apartment: parsed.data.apartment || null,
    comment: parsed.data.comment || null,
    phone,
    userId: user.id,
    isDefault: existing.length === 0,
  });
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteAddress(id: string) {
  const user = await currentUser();
  if (!user) return;
  await db.delete(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id)));
  revalidatePath("/account");
}

export async function makeDefaultAddress(id: string) {
  const user = await currentUser();
  if (!user) return;
  const [own] = await db.select({ id: s.addresses.id }).from(s.addresses).where(and(eq(s.addresses.id, id), eq(s.addresses.userId, user.id)));
  if (!own) return;
  await db.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, user.id));
  await db.update(s.addresses).set({ isDefault: true }).where(eq(s.addresses.id, id));
  revalidatePath("/account");
}
