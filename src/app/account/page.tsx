import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n";
import { requireUser } from "@/lib/session";
import { db, schema as s } from "@/db";
import { formatKzt } from "@/lib/pricing";
import { signOutAction } from "@/app/actions/auth";
import { AddressBook } from "@/components/account/AddressBook";
import { StatusBadge } from "@/components/account/StatusBadge";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.title, robots: { index: false } };
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const { t, locale } = await getI18n();
  const [orders, addresses] = await Promise.all([
    db.select().from(s.orders).where(eq(s.orders.userId, user.id)).orderBy(desc(s.orders.createdAt)),
    db.select().from(s.addresses).where(eq(s.addresses.userId, user.id)),
  ]);
  const dateLocale = locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU";

  return (
    <div className="container-lux py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.account.title}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{fmt(t.account.hello, { name: user.name || user.email || "" })}</h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/formulas" className="btn btn-ghost btn-sm">{t.nav.formulas}</Link>
          {user.role === "ADMIN" && <Link href="/admin" className="btn btn-ghost btn-sm">{t.nav.admin}</Link>}
          <form action={signOutAction}>
            <button className="btn btn-ghost btn-sm">{t.nav.logout}</button>
          </form>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="orders-h">
        <h2 id="orders-h" className="text-3xl">{t.account.orders}</h2>
        {orders.length === 0 ? (
          <p className="mt-4 card p-6 text-cream/75">{t.account.noOrders}</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="card p-5 grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 items-center hover:border-muted-dark transition-colors">
                  <span>
                    <span className="block text-xs text-muted">{t.account.order}</span>
                    <span className="font-display text-xl">{o.number}</span>
                  </span>
                  <span className="text-sm text-cream/75">{o.createdAt.toLocaleDateString(dateLocale)}</span>
                  <StatusBadge status={o.status} label={t.status[o.status] ?? o.status} />
                  <span className="text-champagne tabular-nums text-right">{formatKzt(o.totalKzt, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14" aria-labelledby="addr-h">
        <h2 id="addr-h" className="text-3xl">{t.account.addresses}</h2>
        <AddressBook
          addresses={addresses.map((a) => ({
            id: a.id,
            label: `${a.firstName} ${a.lastName} · ${a.phone}`,
            line: `${a.city}, ${a.street} ${a.house}${a.apartment ? `, ${a.apartment}` : ""}`,
            isDefault: a.isDefault,
          }))}
        />
      </section>
    </div>
  );
}
