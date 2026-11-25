"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import { assertStaff } from "@/lib/session";
import { BOOKING_STATUSES } from "@/lib/booking";

export async function updateBooking(form: FormData) {
  await assertStaff();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const staffNote = String(form.get("staffNote") ?? "").trim().slice(0, 2000);
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) redirect(`/studio/bookings/${id}`);
  try {
    await db.update(s.bookings).set({ status, staffNote: staffNote || null, updatedAt: new Date() }).where(eq(s.bookings.id, id));
  } catch {
    // Re-activating a cancelled booking whose slot was taken by someone else.
    redirect(`/studio/bookings/${id}?error=slot`);
  }
  revalidatePath("/studio/bookings");
  revalidatePath("/book");
  redirect(`/studio/bookings/${id}?saved=1`);
}
