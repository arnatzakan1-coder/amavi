import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { formatKzt } from "@/lib/pricing";
import { ORDER_STATUSES } from "@/lib/order-status";
import { StatusBadge } from "@/components/account/StatusBadge";
import { H1 } from "@/components/admin/ui";
import ru from "@/i18n/ru";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : null;
  const orders = await db
    .select({ o: s.orders, email: s.users.email })
    .from(s.orders)
    .innerJoin(s.users, eq(s.users.id, s.orders.userId))
    .where(status ? eq(s.orders.status, status) : undefined)
    .orderBy(desc(s.orders.createdAt))
    .limit(200);
  return (
    <>
      <H1>Заказы</H1>
      <nav className="flex flex-wrap gap-1.5 mb-5" aria-label="Фильтр статуса">
        <Link href="/admin/orders" className={`chip min-h-[34px] ${!status ? "bg-champagne text-ink" : ""}`}>Все</Link>
        {ORDER_STATUSES.map((st) => (
          <Link key={st} href={`/admin/orders?status=${st}`} className={`chip min-h-[34px] ${status === st ? "bg-champagne text-ink" : ""}`}>{ru.status[st]}</Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-left text-xs text-muted"><tr className="border-b border-line"><th className="p-3">Номер</th><th className="p-3">Дата</th><th className="p-3">Клиент</th><th className="p-3">Статус</th><th className="p-3">Оплата</th><th className="p-3 text-right">Сумма</th></tr></thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">Заказов нет</td></tr>}
            {orders.map(({ o, email }) => (
              <tr key={o.id} className="hover:bg-ink-3/40">
                <td className="p-3"><Link className="text-champagne underline underline-offset-4" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td className="p-3 text-muted">{o.createdAt.toLocaleString("ru-RU")}</td>
                <td className="p-3">{o.contactName}<span className="block text-xs text-muted">{o.contactPhone} · {email}</span></td>
                <td className="p-3"><StatusBadge status={o.status} label={ru.status[o.status] ?? o.status} /></td>
                <td className="p-3 text-xs">{o.paymentCode}</td>
                <td className="p-3 text-right tabular-nums">{formatKzt(o.totalKzt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
