import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCreatorData, getVolumes, toRule } from "@/lib/data";
import { requireStaff } from "@/lib/session";
import { parseQuestionnaire } from "@/lib/questionnaire";
import { getFormulasForUser } from "@/lib/formulas";
import { pick } from "@/i18n";
import { Creator, type CreatorNote } from "@/components/creator/Creator";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.create };
}

// Staff only: perfumers record the client's formula during the studio session.
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ formula?: string; from?: string; booking?: string }> }) {
  const sp = await searchParams;
  await requireStaff(`/create${sp.booking ? `?booking=${sp.booking}` : ""}`);
  const { locale, t } = await getI18n();
  const [{ notes, rules, pairs, events, concentrations }, volumes] = await Promise.all([getCreatorData(), getVolumes()]);

  let staff: { bookingId: string | null; client: string | null } = { bookingId: null, client: null };
  let suggestedName = "";
  if (sp.booking) {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, sp.booking));
    if (b) {
      staff = { bookingId: b.id, client: `${b.contactName} · ${b.number}` };
      suggestedName = parseQuestionnaire(b.questionnaireJson)?.perfumeName ?? "";
    }
  }

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
  if (sp.formula) {
    const [f] = await getFormulasForUser(null, [sp.formula]);
    if (f) initial = { formulaId: f.id, name: f.name, eventSlug: f.eventSlug, concentrationPct: f.concentrationPct, items: f.items };
  } else if (staff.bookingId) {
    const def = concentrations.find((c) => c.isDefault)?.pct ?? concentrations[0]?.pct ?? 20;
    initial = { formulaId: null, name: suggestedName, eventSlug: null, concentrationPct: def, items: [] };
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
        {staff.bookingId && (
          <a href={`/studio/bookings/${staff.bookingId}`} className="text-sm text-muted hover:text-cream">← {t.creator.backToBooking}</a>
        )}
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
        loggedIn
        initial={initial}
        staff={staff}
      />
    </div>
  );
}
