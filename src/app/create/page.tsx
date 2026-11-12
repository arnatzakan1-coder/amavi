import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCreatorData, getVolumes, toRule } from "@/lib/data";
import { currentUser } from "@/lib/session";
import { getFormulasForUser } from "@/lib/formulas";
import { pick } from "@/i18n";
import { Creator, type CreatorNote } from "@/components/creator/Creator";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.create };
}

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ formula?: string; from?: string }> }) {
  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const [{ notes, rules, pairs, events, concentrations }, user, volumes] = await Promise.all([
    getCreatorData(),
    currentUser(),
    getVolumes(),
  ]);

  const creatorNotes: CreatorNote[] = notes.map((n) => ({
    ...toRule(n),
    name: pick(n, "name", locale),
    description: pick(n, "desc", locale) || null,
    material: n.material,
    intensity: n.intensity,
    tierVerified: n.tierVerified,
  }));

  // Load a saved formula (owner only) or a collection fragrance as the starting point.
  let initial: { formulaId: string | null; name: string; eventSlug: string | null; concentrationPct: number; items: { slug: string; parts: number; tier: "TOP" | "HEART" | "BASE" }[] } | null = null;
  if (sp.formula && user) {
    const [f] = await getFormulasForUser(user.id, [sp.formula]);
    if (f) initial = { formulaId: f.id, name: f.name, eventSlug: f.eventSlug, concentrationPct: f.concentrationPct, items: f.items };
  } else if (sp.from) {
    const [c] = await db.select().from(s.collection).where(eq(s.collection.id, sp.from));
    if (c?.active) {
      try {
        initial = { formulaId: null, name: c.name, eventSlug: c.eventSlug, concentrationPct: c.concentrationPct, items: JSON.parse(c.itemsJson) };
      } catch {}
    }
  }

  return (
    <div className="container-lux pt-8 pb-28 lg:pb-16">
      <header className="mb-8">
        <p className="eyebrow">{t.creator.title}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{t.creator.subtitle}</h1>
      </header>
      <Creator
        notes={creatorNotes}
        rules={rules}
        pairs={pairs}
        events={events.map((e) => ({ slug: e.slug, name: pick(e, "name", locale), families: e.recommendedFamilies.split(",").filter(Boolean) }))}
        concentrations={concentrations.map((c) => ({ pct: c.pct, isDefault: c.isDefault }))}
        volumes={volumes.map((v) => ({ ml: v.ml, priceKzt: v.priceKzt }))}
        loggedIn={Boolean(user)}
        initial={initial}
      />
    </div>
  );
}
