import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { db, schema as s } from "@/db";
import { getNotes } from "@/lib/data";
import { requireStaff } from "@/lib/session";
import { getFormulasForUser } from "@/lib/formulas";
import { MatchView } from "@/components/match/MatchView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.match.title, robots: { index: false } };
}

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ formula?: string }> }) {
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  await requireStaff("/match");
  const [notes, niche] = await Promise.all([getNotes(), db.select().from(s.nicheFragrances).where(eq(s.nicheFragrances.active, true))]);
  // Staff tool: recent client formulas (confidential) for comparison.
  const formulas = (await getFormulasForUser(null, sp.formula ? [sp.formula] : undefined)).slice(0, 60);

  return (
    <div className="container-lux py-10 sm:py-14">
      <p className="eyebrow">{t.match.title}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl max-w-3xl">{t.match.subtitle}</h1>
      <p className="mt-4 text-sm text-muted max-w-3xl">{t.match.disclaimer}</p>
      <MatchView
        notes={notes.map((n) => ({ slug: n.slug, name: pick(n, "name", locale), family: n.family }))}
        catalogue={niche.map((n) => ({
          id: n.id,
          brand: n.brand,
          name: n.name,
          notes: n.notes.split(",").map((x) => x.trim()).filter(Boolean),
          accords: n.accords.split(",").map((x) => x.trim()).filter(Boolean),
          imageUrl: n.imageUrl,
          imageRightsConfirmed: n.imageRightsConfirmed,
        }))}
        formulas={formulas.map((f) => ({ id: f.id, name: f.name, items: f.items }))}
        initialFormula={sp.formula ?? null}
      />
    </div>
  );
}
