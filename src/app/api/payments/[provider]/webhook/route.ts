import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { ONLINE_PROVIDERS, PaymentNotConfigured, isOnline } from "@/lib/payments";

// Provider → AMAVI payment notification. The provider adapter verifies the signature;
// the order is updated only on a verified "paid" notification, idempotently.
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isOnline(provider)) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const adapter = ONLINE_PROVIDERS[provider];
  if (!adapter.isReady()) return NextResponse.json({ error: "not configured" }, { status: 501 });

  let event;
  try {
    event = await adapter.verifyWebhook(req);
  } catch (e) {
    if (e instanceof PaymentNotConfigured) return NextResponse.json({ error: "not configured" }, { status: 501 });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const [order] = await db.select().from(s.orders).where(eq(s.orders.number, event.orderNumber));
  if (!order || order.paymentProvider !== provider) return NextResponse.json({ error: "order not found" }, { status: 404 });

  if (event.paid && !order.paidAt) {
    await db
      .update(s.orders)
      .set({ status: "PERFUMER_REVIEW", paidAt: new Date(), paymentRef: event.ref })
      .where(eq(s.orders.id, order.id));
    await db.insert(s.orderEvents).values([
      { orderId: order.id, status: "PAID", note: `${provider}:${event.ref}` },
      { orderId: order.id, status: "PERFUMER_REVIEW" },
    ]);
  }
  return NextResponse.json({ ok: true });
}
