import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { Lock } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/session";
import { db, schema as s } from "@/db";
import { getVolumes } from "@/lib/data";
import { CONFIDENTIAL_NOTICE } from "@/lib/confidential";
import { FormulaCard } from "@/components/shop/FormulaCard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.formulas.title, robots: { index: false } };
}

// Customers see only the perfume name and their order history. Ingredient combinations are
// never loaded here — they stay with AMAVI perfumers and staff (see /admin/formulas).
export default async function FormulasPage() {
  const user = await requireUser("/formulas");
  const { t, locale } = await getI18n();
  const [formulas, volumes] = await Promise.all([
    db
      .select({ id: s.formulas.id, name: s.formulas.name, concentrationPct: s.formulas.concentrationPct, createdAt: s.formulas.createdAt })
      .from(s.formulas)
      .where(eq(s.formulas.userId, user.id))
      .orderBy(desc(s.formulas.createdAt)),
    getVolumes(),
  ]);
  const ids = formulas.map((f) => f.id);
  const history = ids.length
    ? await db
        .select({
          formulaId: s.orderItems.formulaId,
          number: s.orders.number,
          status: s.orders.status,
          createdAt: s.orders.createdAt,
          volumeMl: s.orderItems.volumeMl,
          qty: s.orderItems.qty,
          userId: s.orders.userId,
        })
        .from(s.orderItems)
        .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
        .where(inArray(s.orderItems.formulaId, ids))
        .orderBy(desc(s.orders.createdAt))
    : [];
  const dateLocale = locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU";

  return (
    <div className="container-lux py-10 sm:py-14">
      <p className="eyebrow">AMAVI</p>
      <h1 className="mt-3 text-4xl sm:text-5xl flex items-center gap-4">
        <Lock size={30} strokeWidth={1.8} aria-hidden /> {t.formulas.title}
      </h1>
      <p className="mt-4 text-muted max-w-2xl">{t.formulas.lead}</p>

      <div role="note" className="mt-6 flex gap-3 rounded-2xl bg-cream text-ink-2 p-5 max-w-3xl">
        <Lock size={20} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{CONFIDENTIAL_NOTICE}</p>
          {t.formulas.confidential && <p className="mt-1 text-sm opacity-85">{t.formulas.confidential}</p>}
        </div>
      </div>

      {formulas.length === 0 ? (
        <div className="mt-10 card p-10 text-center">
          <p className="text-muted max-w-lg mx-auto">{t.formulas.empty}</p>
          <Link href="/book" className="btn btn-gold mt-6">{t.formulas.book}</Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formulas.map((f) => (
            <FormulaCard
              key={f.id}
              formula={{ id: f.id, name: f.name, concentrationPct: f.concentrationPct, created: f.createdAt.toLocaleDateString(dateLocale) }}
              orders={history
                .filter((h) => h.formulaId === f.id && h.userId === user.id)
                .map((h) => ({ number: h.number, status: h.status, date: h.createdAt.toLocaleDateString(dateLocale), volumeMl: h.volumeMl, qty: h.qty }))}
              volumes={volumes.map((v) => ({ ml: v.ml, priceKzt: v.priceKzt }))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
