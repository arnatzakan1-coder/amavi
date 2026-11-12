"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { currentUser } from "@/lib/session";
import { getConcentrations, getDeliveryMethods, getPaymentMethods, getPriceConfig } from "@/lib/data";
import { getFormulasForUser, validateOnServer, pickConcentration } from "@/lib/formulas";
import { priceOrder, PricingError, MAX_QTY } from "@/lib/pricing";
import { normalizeKzPhone } from "@/lib/phone";
import { ONLINE_PROVIDERS, isOnline, paymentAvailable } from "@/lib/payments";

const lineSchema = z.object({
  formulaId: z.string().min(1).max(64),
  volumeMl: z.number().int(),
  concentrationPct: z.number().int(),
  qty: z.number().int().min(1).max(MAX_QTY),
});

const addressSchema = z.object({
  city: z.string().trim().min(1).max(80),
  street: z.string().trim().min(1).max(120),
  house: z.string().trim().min(1).max(20),
  apartment: z.string().trim().max(20).optional().default(""),
  comment: z.string().trim().max(300).optional().default(""),
});

const orderSchema = z.object({
  lines: z.array(lineSchema).min(1).max(20),
  deliveryCode: z.string().max(40),
  paymentCode: z.string().max(40),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().max(30),
  addressId: z.string().max(64).nullable().optional(),
  address: addressSchema.nullable().optional(),
  saveAddress: z.boolean().optional(),
  consent: z.literal(true),
});

export type OrderResult =
  | { ok: true; number: string; redirectUrl: string | null; manual: "boutique" | "kaspi_invoice" | null }
  | { ok: false; error: string; field?: string };

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `AM-${ymd}-${rnd}`;
}

export async function createOrder(input: unknown): Promise<OrderResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "AUTH" };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.path[0] === "consent" ? "CONSENT" : "INPUT", field: String(issue?.path.join(".") ?? "") };
  }
  const data = parsed.data;
  // Lines added to the cart before a concentration was retired are moved to the current one.
  const concs = await getConcentrations();
  for (const l of data.lines) l.concentrationPct = pickConcentration(l.concentrationPct, concs);

  const phone = normalizeKzPhone(data.phone);
  if (!phone) return { ok: false, error: "PHONE", field: "phone" };

  // Delivery
  const delivery = (await getDeliveryMethods()).find((d) => d.code === data.deliveryCode);
  if (!delivery || delivery.priceKzt == null) return { ok: false, error: "DELIVERY_UNAVAILABLE" };

  // Payment
  const payment = (await getPaymentMethods(true)).find((p) => p.code === data.paymentCode);
  if (!payment || !paymentAvailable(payment.code, payment.active)) return { ok: false, error: "PAYMENT_UNAVAILABLE" };
  if (payment.code === "boutique" && delivery.requiresAddress) return { ok: false, error: "BOUTIQUE_PAY_PICKUP_ONLY" };

  // Address (server-side: owned saved address or a new one)
  let address: z.infer<typeof addressSchema> | null = null;
  if (delivery.requiresAddress) {
    if (data.addressId) {
      const [a] = await db
        .select()
        .from(s.addresses)
        .where(and(eq(s.addresses.id, data.addressId), eq(s.addresses.userId, user.id)));
      if (!a) return { ok: false, error: "ADDRESS_REQUIRED" };
      address = { city: a.city, street: a.street, house: a.house, apartment: a.apartment ?? "", comment: data.address?.comment || a.comment || "" };
    } else if (data.address) {
      address = data.address;
    } else {
      return { ok: false, error: "ADDRESS_REQUIRED" };
    }
  }

  // Formulas: must belong to the user and still satisfy current rules.
  const ids = [...new Set(data.lines.map((l) => l.formulaId))];
  const formulas = await getFormulasForUser(user.id, ids);
  if (formulas.length !== ids.length) return { ok: false, error: "FORMULA_NOT_FOUND" };
  const snapshots = new Map<string, { name: string; json: string }>();
  for (const f of formulas) {
    const { result, items } = await validateOnServer(f.items, f.concentrationPct);
    if (!result.ok) return { ok: false, error: "FORMULA_INVALID" };
    snapshots.set(f.id, { name: f.name, json: JSON.stringify({ items, shares: result.shares, eventSlug: f.eventSlug }) });
  }

  // Price — computed here, never taken from the client.
  let price;
  try {
    price = priceOrder(
      data.lines.map((l) => ({ volumeMl: l.volumeMl, concentrationPct: l.concentrationPct, qty: l.qty })),
      await getPriceConfig(),
      delivery.priceKzt,
    );
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, error: e.message };
    throw e;
  }

  const online = isOnline(payment.code);
  const number = orderNumber();
  const status = online ? "PENDING_PAYMENT" : "AWAITING_CONFIRMATION";

  const [order] = await db
    .insert(s.orders)
    .values({
      number,
      userId: user.id,
      status,
      deliveryCode: delivery.code,
      paymentCode: payment.code,
      addressJson: address ? JSON.stringify(address) : null,
      contactName: `${data.firstName} ${data.lastName}`,
      contactPhone: phone,
      subtotalKzt: price.subtotalKzt,
      discountKzt: price.discountKzt,
      deliveryFeeKzt: price.deliveryFeeKzt,
      totalKzt: price.totalKzt,
      paymentProvider: online ? payment.code : null,
      consentAt: new Date(),
    })
    .returning();

  await db.insert(s.orderItems).values(
    price.lines.map((l, i) => {
      const line = data.lines[i];
      const snap = snapshots.get(line.formulaId)!;
      return {
        orderId: order.id,
        formulaId: line.formulaId,
        formulaName: snap.name,
        formulaJson: snap.json,
        volumeMl: l.volumeMl,
        concentrationPct: l.concentrationPct,
        unitPriceKzt: l.unitPriceKzt,
        qty: l.qty,
      };
    }),
  );
  await db.insert(s.orderEvents).values({ orderId: order.id, status });

  if (data.saveAddress && address && !data.addressId) {
    const existing = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id));
    await db.insert(s.addresses).values({
      userId: user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      phone,
      city: address.city,
      street: address.street,
      house: address.house,
      apartment: address.apartment || null,
      comment: address.comment || null,
      isDefault: existing.length === 0,
    });
  }

  let redirectUrl: string | null = null;
  if (online) {
    const provider = ONLINE_PROVIDERS[payment.code as keyof typeof ONLINE_PROVIDERS];
    const base =
      process.env.APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
    const pay = await provider.createPayment(
      { id: order.id, number, totalKzt: price.totalKzt, email: user.email, phone },
      `${base}/account/orders/${number}`,
    );
    await db.update(s.orders).set({ paymentRef: pay.ref }).where(eq(s.orders.id, order.id));
    redirectUrl = pay.redirectUrl;
  }

  revalidatePath("/account");
  return { ok: true, number, redirectUrl, manual: online ? null : (payment.code as "boutique" | "kaspi_invoice") };
}
