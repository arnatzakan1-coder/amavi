import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { formatKzt } from "@/lib/pricing";
import { getNotes } from "@/lib/data";
import { ORDER_STATUSES } from "@/lib/order-status";
import { updateOrderStatus } from "../../actions";
import { StatusBadge } from "@/components/account/StatusBadge";
import { H1, Saved, Submit } from "@/components/admin/ui";
import ru from "@/i18n/ru";

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) notFound();
  const [items, events, notes, [user]] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, id)).orderBy(asc(s.orderEvents.createdAt)),
    getNotes(),
    db.select({ email: s.users.email, name: s.users.name }).from(s.users).where(eq(s.users.id, order.userId)),
  ]);
  const name = (slug: string) => notes.find((n) => n.slug === slug)?.nameRu ?? slug;
  const addr = order.addressJson ? JSON.parse(order.addressJson) : null;

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-cream">← Заказы</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4"><H1>{order.number}</H1><StatusBadge status={order.status} label={ru.status[order.status] ?? order.status} /></div>
      <Saved show={sp.saved === "1"} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="text-2xl">Формулы для изготовления</h2>
          {items.map((i) => {
            const snap = JSON.parse(i.formulaJson) as { items: { slug: string; parts: number; tier: string }[]; shares: Record<string, number> };
            return (
              <div key={i.id} className="mt-5 border-t border-line pt-4">
                <p className="font-display text-2xl">{i.formulaName}</p>
                <p className="text-sm text-muted">{i.volumeMl} мл · концентрация {i.concentrationPct}% · × {i.qty} · {formatKzt(i.unitPriceKzt)} / шт.</p>
                <table className="mt-3 w-full text-sm">
                  <thead className="text-xs text-muted text-left"><tr><th className="py-1">Нота</th><th>Уровень</th><th className="text-right">Частей</th><th className="text-right">Доля</th></tr></thead>
                  <tbody>
                    {snap.items.map((it) => (
                      <tr key={it.slug} className="border-t border-line/60">
                        <td className="py-1.5">{name(it.slug)}</td>
                        <td>{ru.tiers[it.tier as "TOP"]}</td>
                        <td className="text-right tabular-nums">{it.parts}</td>
                        <td className="text-right tabular-nums">{Math.round((snap.shares[it.slug] ?? 0) * 1000) / 10}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          <dl className="mt-6 border-t border-line pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Сумма</dt><dd>{formatKzt(order.subtotalKzt)}</dd></div>
            {order.discountKzt > 0 && <div className="flex justify-between"><dt className="text-muted">Скидка (набор)</dt><dd>−{formatKzt(order.discountKzt)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Доставка</dt><dd>{formatKzt(order.deliveryFeeKzt)}</dd></div>
            <div className="flex justify-between font-display text-2xl"><dt>Итого</dt><dd className="text-champagne">{formatKzt(order.totalKzt)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="card p-6 text-sm space-y-2">
            <h2 className="text-2xl mb-2">Клиент</h2>
            <p>{order.contactName}</p>
            <p><a className="text-champagne" href={`tel:${order.contactPhone}`}>{order.contactPhone}</a> · <a className="text-champagne" href={`https://wa.me/${order.contactPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
            <p className="text-muted">{user?.email}</p>
            <p><span className="text-muted">Доставка:</span> {order.deliveryCode}</p>
            {addr && <p>{addr.city}, {addr.street} {addr.house}{addr.apartment ? `, ${addr.apartment}` : ""}{addr.comment ? ` — «${addr.comment}»` : ""}</p>}
            <p><span className="text-muted">Оплата:</span> {order.paymentCode}{order.paidAt ? ` · оплачен ${order.paidAt.toLocaleString("ru-RU")}` : ""}</p>
            <p className="text-xs text-muted">Согласие на обработку данных: {order.consentAt.toLocaleString("ru-RU")}</p>
          </section>

          <form action={updateOrderStatus} className="card p-6 space-y-3">
            <h2 className="text-2xl">Сменить статус</h2>
            <input type="hidden" name="id" value={order.id} />
            <label htmlFor="st" className="field-label">Статус</label>
            <select id="st" name="status" defaultValue={order.status} className="field">
              {ORDER_STATUSES.map((st) => <option key={st} value={st}>{ru.status[st]}</option>)}
            </select>
            <label htmlFor="nt" className="field-label">Комментарий (виден только команде)</label>
            <input id="nt" name="note" className="field" maxLength={300} />
            <Submit />
          </form>

          <section className="card p-6">
            <h2 className="text-2xl">История</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {events.map((e) => <li key={e.id}>{ru.status[e.status] ?? e.status} <span className="text-xs text-muted">· {e.createdAt.toLocaleString("ru-RU")}{e.note ? ` · ${e.note}` : ""}</span></li>)}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
