import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { db, schema as s } from "@/db";
import { getNotes } from "@/lib/data";
import { FAMILY_COLORS, TIERS, type Family } from "@/lib/families";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.collection.title, description: t.collection.subtitle };
}

export default async function CollectionPage() {
  const { t, locale } = await getI18n();
  const [items, notes] = await Promise.all([
    db.select().from(s.collection).where(eq(s.collection.active, true)).orderBy(asc(s.collection.sortOrder)),
    getNotes(),
  ]);
  const noteBy = new Map(notes.map((n) => [n.slug, n]));

  return (
    <div className="container-lux py-10 sm:py-14">
      <p className="eyebrow">AMAVI</p>
      <h1 className="mt-3 text-4xl sm:text-6xl">{t.collection.title}</h1>
      <p className="mt-4 text-cream/75 max-w-2xl">{t.collection.subtitle}</p>

      {items.length === 0 ? (
        <div className="mt-12 card p-10 sm:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <p className="font-display text-2xl sm:text-3xl text-cream/90 max-w-2xl">{t.collection.empty}</p>
          <Link href="/create" className="btn btn-gold">{t.nav.create}</Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => {
            let parsed: { slug: string; parts: number; tier: string }[] = [];
            try {
              parsed = JSON.parse(c.itemsJson);
            } catch {}
            const total = parsed.reduce((a, b) => a + b.parts, 0) || 1;
            return (
              <li key={c.id} className="card p-7 flex flex-col">
                <h2 className="text-3xl">{c.name}</h2>
                <p className="mt-2 text-sm text-cream/75 flex-1">{pick(c, "desc", locale)}</p>
                <div className="mt-5 flex h-2 rounded-full overflow-hidden bg-ink-3" aria-hidden>
                  {parsed.map((p, i) => (
                    <div key={i} style={{ width: `${(p.parts / total) * 100}%`, background: FAMILY_COLORS[(noteBy.get(p.slug)?.family ?? "MUSKY") as Family] }} />
                  ))}
                </div>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {TIERS.map((tier) => {
                    const list = parsed.filter((p) => p.tier === tier);
                    if (!list.length) return null;
                    return (
                      <div key={tier} className="grid grid-cols-[110px_1fr] gap-2">
                        <dt className="text-xs text-muted pt-0.5">{t.tiers[tier]}</dt>
                        <dd>{list.map((p) => (noteBy.get(p.slug) ? pick(noteBy.get(p.slug)!, "name", locale) : p.slug)).join(", ")}</dd>
                      </div>
                    );
                  })}
                </dl>
                <Link href={`/create?from=${c.id}`} className="btn btn-ghost btn-sm mt-6">{t.collection.customize}</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
