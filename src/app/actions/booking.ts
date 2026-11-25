"use server";
import { and, eq, gte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { currentUser } from "@/lib/session";
import { getPerfumers, getSetting, getVolumes } from "@/lib/data";
import { almatyToUtc, depositFor, slotStarts, slotState, utcToAlmaty } from "@/lib/booking";
import { questionnaireSchema } from "@/lib/questionnaire";
import { normalizeKzPhone } from "@/lib/phone";

const bookingSchema = z.object({
  perfumerId: z.string().min(1).max(64),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(24 * 60),
  volumeMl: z.number().int(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().max(30),
  questionnaire: questionnaireSchema,
  consent: z.literal(true),
});

export type BookingResult =
  | { ok: true; number: string }
  | { ok: false; error: "AUTH" | "INPUT" | "PHONE" | "CONSENT" | "PERFUMER" | "SLOT" | "TAKEN" | "VOLUME" | "LIMIT" };

const MAX_ACTIVE_BOOKINGS = 3;

function bookingNumber(startsAt: number) {
  const { day } = utcToAlmaty(startsAt);
  const rnd = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
  return `BK-${day.slice(2).replaceAll("-", "")}-${rnd}`;
}

export async function createBooking(input: unknown): Promise<BookingResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "AUTH" };
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.path[0] === "consent" ? "CONSENT" : "INPUT" };
  }
  const d = parsed.data;
  const phone = normalizeKzPhone(d.phone);
  if (!phone) return { ok: false, error: "PHONE" };

  const [cfg, perfumers, volumes] = await Promise.all([getSetting("booking"), getPerfumers(), getVolumes()]);
  const perfumer = perfumers.find((p) => p.id === d.perfumerId);
  if (!perfumer) return { ok: false, error: "PERFUMER" };
  const volume = volumes.find((v) => v.ml === d.volumeMl);
  if (!volume) return { ok: false, error: "VOLUME" };
  if (!slotStarts(cfg).includes(d.startMin)) return { ok: false, error: "SLOT" };

  const now = Date.now();
  const startsAt = almatyToUtc(d.day, d.startMin);
  if (startsAt > now + (cfg.horizonDays + 1) * 86_400_000) return { ok: false, error: "SLOT" };

  const active = await db
    .select({ id: s.bookings.id, perfumerId: s.bookings.perfumerId, startsAt: s.bookings.startsAt, userId: s.bookings.userId })
    .from(s.bookings)
    .where(and(ne(s.bookings.status, "CANCELLED"), gte(s.bookings.startsAt, new Date(now - 86_400_000))));
  const mine = active.filter((b) => b.userId === user.id && +b.startsAt > now);
  if (mine.length >= MAX_ACTIVE_BOOKINGS) return { ok: false, error: "LIMIT" };
  const booked = new Set(active.filter((b) => b.perfumerId === perfumer.id).map((b) => +b.startsAt));
  const state = slotState(perfumer, d.day, d.startMin, cfg, booked, now);
  if (state === "booked") return { ok: false, error: "TAKEN" };
  if (state !== "free") return { ok: false, error: "SLOT" };

  const number = bookingNumber(startsAt);
  try {
    await db.insert(s.bookings).values({
      number,
      userId: user.id,
      perfumerId: perfumer.id,
      startsAt: new Date(startsAt),
      durationMin: cfg.slotMinutes,
      volumeMl: volume.ml,
      depositKzt: depositFor(volume.priceKzt, cfg.depositPct),
      contactName: d.name,
      contactPhone: phone,
      questionnaireJson: JSON.stringify(d.questionnaire),
      consentAt: new Date(),
    });
  } catch (e) {
    // The partial unique index (perfumer, time) rejects a slot taken a moment ago.
    if (/UNIQUE|constraint/i.test(String((e as Error)?.message ?? e))) return { ok: false, error: "TAKEN" };
    throw e;
  }
  if (!user.phone) await db.update(s.users).set({ phone }).where(eq(s.users.id, user.id));
  revalidatePath("/book");
  revalidatePath("/account");
  revalidatePath("/admin/bookings");
  return { ok: true, number };
}

/** Customers can cancel their own upcoming booking; the slot becomes free again. */
export async function cancelMyBooking(id: string) {
  const user = await currentUser();
  if (!user) return { ok: false };
  const [b] = await db.select().from(s.bookings).where(and(eq(s.bookings.id, id), eq(s.bookings.userId, user.id)));
  if (!b || +b.startsAt <= Date.now() || !["PENDING_DEPOSIT", "CONFIRMED"].includes(b.status)) return { ok: false };
  await db.update(s.bookings).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(s.bookings.id, id));
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath("/admin/bookings");
  return { ok: true };
}
