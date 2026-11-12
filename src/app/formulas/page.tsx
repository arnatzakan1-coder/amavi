import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { requireUser } from "@/lib/session";
import { getFormulasForUser } from "@/lib/formulas";
import { getEvents, getNotes, getVolumes } from "@/lib/data";
import { FormulaCard } from "@/components/shop/FormulaCard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.formulas.title, robots: { index: false } };
}

export default async function FormulasPage() {
  const user = await requireUser("/formulas");
  const { t, locale } = await getI18n();
  const [formulas, notes, events, volumes] = await Promise.all([getFormulasForUser(user.id), getNotes(), getEvents(false), getVolumes()]);
  const noteBy = new Map(notes.map((n) => [n.slug, n]));

  return (
    <div className="container-lux py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">{t.formulas.title}</h1>
        <Link href="/create" className="btn btn-gold btn-sm">{t.nav.create}</Link>
      </div>
      {formulas.length === 0 ? (
        <div className="mt-10 card p-10 text-center">
          <p className="text-cream/75">{t.formulas.empty}</p>
          <Link href="/create" className="btn btn-gold mt-6">{t.formulas.create}</Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formulas.map((f) => (
            <FormulaCard
              key={f.id}
              formula={{
                id: f.id,
                name: f.name,
                concentrationPct: f.concentrationPct,
                createdAt: f.createdAt.toISOString(),
                event: f.eventSlug ? pick(events.find((e) => e.slug === f.eventSlug) ?? {}, "name", locale) : null,
                notes: f.items.map((i) => ({ name: noteBy.get(i.slug) ? pick(noteBy.get(i.slug)!, "name", locale) : i.slug, family: noteBy.get(i.slug)?.family ?? "", tier: i.tier, parts: i.parts })),
              }}
              volumes={volumes.map((v) => ({ ml: v.ml, priceKzt: v.priceKzt }))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
