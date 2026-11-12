"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { useDraft, useHydrated } from "@/lib/stores";
import { matchNiche, type NicheEntry } from "@/lib/matching";
import { FAMILIES, FAMILY_COLORS, type Family } from "@/lib/families";

type Note = { slug: string; name: string; family: string };
type Item = { slug: string; parts: number; tier: string };

function analyse(items: Item[], famOf: Record<string, string>) {
  const total = items.reduce((s, i) => s + Math.max(0, i.parts), 0);
  const shares: Record<string, number> = {};
  const balance = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
  if (!total) return { shares, balance };
  for (const i of items) {
    const sh = Math.max(0, i.parts) / total;
    shares[i.slug] = (shares[i.slug] ?? 0) + sh;
    const f = famOf[i.slug] as Family;
    if (f in balance) balance[f] += sh;
  }
  return { shares, balance };
}

export function MatchView({
  notes,
  catalogue,
  formulas,
  initialFormula,
}: {
  notes: Note[];
  catalogue: NicheEntry[];
  formulas: { id: string; name: string; items: Item[] }[];
  initialFormula: string | null;
}) {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const draft = useDraft();
  const [source, setSource] = useState<string>(initialFormula && formulas.some((f) => f.id === initialFormula) ? initialFormula : "draft");

  const famOf = useMemo(() => Object.fromEntries(notes.map((n) => [n.slug, n.family])), [notes]);
  const nameOf = (slug: string) => notes.find((n) => n.slug === slug)?.name ?? slug;

  const items: Item[] = source === "draft" ? draft.items : formulas.find((f) => f.id === source)?.items ?? [];
  const { shares, balance } = analyse(items, famOf);
  const results = items.length ? matchNiche(shares, balance, catalogue, famOf, 5) : [];

  if (!hydrated) return <div className="mt-8 card h-48 animate-pulse" aria-busy="true" />;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr] items-start">
      <aside className="card p-5 space-y-4 lg:sticky lg:top-[90px]">
        <fieldset>
          <legend className="font-display text-2xl">{t.match.chooseFormula}</legend>
          <div className="mt-3 grid gap-2">
            <label className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${source === "draft" ? "border-champagne" : "border-line"}`}>
              <input type="radio" name="src" className="accent-[#e6d3ae]" checked={source === "draft"} onChange={() => setSource("draft")} />
              <span className="text-sm">{t.match.useCurrent}{draft.name ? ` — ${draft.name}` : ""}</span>
            </label>
            {formulas.map((f) => (
              <label key={f.id} className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer ${source === f.id ? "border-champagne" : "border-line"}`}>
                <input type="radio" name="src" className="accent-[#e6d3ae]" checked={source === f.id} onChange={() => setSource(f.id)} />
                <span className="text-sm truncate">{f.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {items.length > 0 && (
          <div>
            <p className="text-xs text-muted">{t.creator.composition}</p>
            <p className="mt-1 text-sm text-cream/85">{items.map((i) => nameOf(i.slug)).join(", ")}</p>
          </div>
        )}
        <details className="text-xs text-muted">
          <summary className="cursor-pointer text-cream/80 py-1">{t.match.how}</summary>
          <p className="mt-2">{t.match.howText}</p>
        </details>
      </aside>

      <section aria-labelledby="results-title">
        <h2 id="results-title" className="text-3xl">{t.match.results}</h2>
        {items.length === 0 ? (
          <div className="mt-6 card p-8">
            <p className="text-cream/75">{t.match.noFormula}</p>
            <Link href="/create" className="btn btn-gold mt-5">{t.nav.create}</Link>
          </div>
        ) : results.length === 0 ? (
          <p className="mt-6 card p-8 text-cream/75">{t.match.none}</p>
        ) : (
          <ol className="mt-6 grid gap-4">
            {results.map((r, idx) => (
              <li key={r.id} className="card p-6 grid sm:grid-cols-[1fr_140px] gap-5 animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div>
                  <p className="eyebrow">{r.brand}</p>
                  <h3 className="mt-2 text-3xl">{r.name}</h3>
                  {r.sharedNotes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted">{t.match.sharedNotes}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {r.sharedNotes.map((s) => (
                          <li key={s} className="chip text-cream/85">
                            <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[famOf[s] as Family] }} aria-hidden />
                            {nameOf(s)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-4 text-sm text-cream/75">
                    <span className="text-muted">{t.match.why}: </span>
                    {r.sharedNotes.length
                      ? fmt(t.match.whyText, { n: r.sharedNotes.length, fam: r.sharedFamilies.map((f) => t.families[f].toLowerCase()).join(", ") || "—" })
                      : fmt(t.match.whyFamilies, { fam: r.sharedFamilies.map((f) => t.families[f].toLowerCase()).join(", ") })}
                  </p>
                </div>
                <div className="sm:text-right">
                  {r.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt={`${r.brand} ${r.name}`} className="mb-3 h-28 w-full object-contain" loading="lazy" />
                  )}
                  <p className="text-xs text-muted">{t.match.similarity}</p>
                  <p className="font-display text-5xl text-champagne tabular-nums">~{r.scorePct}%</p>
                  <div className="mt-2 h-1 rounded-full bg-ink-3 overflow-hidden" aria-hidden>
                    <div className="h-full bg-gradient-to-r from-gold-deep to-champagne" style={{ width: `${r.scorePct}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-6 text-xs text-muted">{t.match.imageNote}</p>
      </section>
    </div>
  );
}
