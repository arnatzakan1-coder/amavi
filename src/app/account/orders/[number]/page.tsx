import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { requireUser } from "@/lib/session";
import { db, schema as s } from "@/db";
import { formatKzt } from "@/lib/pricing";
import { StatusBadge } from "@/components/account/StatusBadge";
import { ReorderButton } from "@/components/account/ReorderButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.order, robots: { index: false } };
}

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const { t, locale } = await getI18n();
  // Ownership enforced in the query: other users' orders are never returned.
  const [order] = await db.select().from(s.orders).where(and(eq(s.orders.number, number), eq(s.orders.userId, user.id)));
  if (!order) notFound();
  const [items, events, delivery, payment, myFormulas] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(asc(s.orderEvents.createdAt)),
    db.select().from(s.deliveryMethods).where(eq(s.deliveryMethods.code, order.deliveryCode)),
    db.select().from(s.paymentMethods).where(eq(s.paymentMethods.code, order.paymentCode)),
    db.select({ id: s.formulas.id }).from(s.formulas).where(eq(s.formulas.userId, user.id)),
  ]);
  const owned = new Set(myFormulas.map((f) => f.id));
  const addr = order.addressJson ? (JSON.parse(order.addressJson) as Record<string, string>) : null;
  const dateLocale = locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU";

  return (
    <div className="container-lux py-10 sm:py-14 max-w-4xl">
      <Link href="/account" className="text-sm text-muted hover:text-cream">← {t.account.title}</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">{order.number}</h1>
        <StatusBadge status={order.status} label={t.status[order.status] ?? order.status} />
      </div>
      <p className="mt-2 text-sm text-muted">{order.createdAt.toLocaleString(dateLocale)}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="text-2xl">{t.checkout.summary}</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="py-3 flex justify-between gap-4 text-sm">
                <span>
                  <span className="block font-display text-xl">{i.formulaName}</span>
                  <span className="text-muted">{i.volumeMl} ml · {i.concentrationPct}% × {i.qty}</span>
                </span>
                <span className="tabular-nums">{formatKzt(i.unitPriceKzt * i.qty, locale)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm border-t border-line pt-4">
            <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd>{formatKzt(order.subtotalKzt, locale)}</dd></div>
            {order.discountKzt > 0 && <div className="flex justify-between text-ok"><dt>{t.home.giftSet}</dt><dd>−{formatKzt(order.discountKzt, locale)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t.cart.delivery}</dt><dd>{formatKzt(order.deliveryFeeKzt, locale)}</dd></div>
            <div className="flex justify-between font-display text-2xl pt-2"><dt>{t.cart.total}</dt><dd className="text-champagne">{formatKzt(order.totalKzt, locale)}</dd></div>
          </dl>
          <ReorderButton
            items={items
              .filter((i) => i.formulaId && owned.has(i.formulaId))
              .map((i) => ({ formulaId: i.formulaId!, formulaName: i.formulaName, volumeMl: i.volumeMl, concentrationPct: i.concentrationPct, qty: i.qty }))}
          />
        </section>

        <div className="space-y-6">
          <section className="card p-6 text-sm space-y-3">
            <p><span className="text-muted">{t.checkout.delivery}: </span>{delivery[0] ? pick(delivery[0], "name", locale) : order.deliveryCode}</p>
            {addr && <p className="text-cream/85">{addr.city}, {addr.street} {addr.house}{addr.apartment ? `, ${addr.apartment}` : ""}</p>}
            <p><span className="text-muted">{t.checkout.payment}: </span>{payment[0] ? pick(payment[0], "name", locale) : order.paymentCode}</p>
            <p><span className="text-muted">{t.checkout.contact}: </span>{order.contactName}, {order.contactPhone}</p>
          </section>
          <section className="card p-6">
            <h2 className="text-2xl">{t.account.history}</h2>
            <ol className="mt-4 space-y-3 border-l border-line pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-champagne" aria-hidden />
                  <span className="block">{t.status[e.status] ?? e.status}</span>
                  <span className="text-xs text-muted">{e.createdAt.toLocaleString(dateLocale)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
