// Composition engine — shared by the creator (client) and the server (save / order).
// The server always re-validates; the client result is only for instant feedback.
import { FAMILIES, TIERS, type Family, type Tier } from "./families";

export type NoteRule = {
  slug: string;
  family: string;
  tier: string | null;
  isFixed: boolean;
  fixedParts: number | null;
  minParts: number;
  maxParts: number;
  maxSharePct: number | null;
  active: boolean;
};

export type CompositionRules = {
  maxNotes: number;
  minNotesPerTier: number;
  verified: boolean;
};

export type Pair = { noteA: string; noteB: string; reason: string | null };

export type FormulaItemInput = { slug: string; parts: number; tier: Tier };

export type ValidationError =
  | { code: "EMPTY" }
  | { code: "UNKNOWN_NOTE"; slug: string }
  | { code: "INACTIVE_NOTE"; slug: string }
  | { code: "DUPLICATE_NOTE"; slug: string }
  | { code: "WRONG_TIER"; slug: string; expected: Tier }
  | { code: "PARTS_RANGE"; slug: string; min: number; max: number }
  | { code: "FIXED_CHANGED"; slug: string }
  | { code: "TOO_MANY_NOTES"; max: number }
  | { code: "TIER_EMPTY"; tier: Tier; min: number }
  | { code: "SHARE_EXCEEDED"; slug: string; maxPct: number }
  | { code: "INCOMPATIBLE"; a: string; b: string; reason: string | null }
  | { code: "BAD_CONCENTRATION"; pct: number };

export type CompositionResult = {
  ok: boolean;
  errors: ValidationError[];
  items: FormulaItemInput[];
  totalParts: number;
  shares: Record<string, number>; // slug → 0..1
  tierShares: Record<Tier, number>;
  familyBalance: Record<Family, number>; // 0..1
};

/** Fixed notes are always part of a formula with their fixed amount. */
export function withFixedNotes(items: FormulaItemInput[], notes: NoteRule[]): FormulaItemInput[] {
  const out = items.filter((i) => !notes.find((n) => n.slug === i.slug && n.isFixed && n.active));
  for (const n of notes) {
    if (n.isFixed && n.active && n.tier) {
      out.push({ slug: n.slug, parts: n.fixedParts ?? n.minParts, tier: n.tier as Tier });
    }
  }
  return out;
}

export function evaluate(
  rawItems: FormulaItemInput[],
  notes: NoteRule[],
  rules: CompositionRules,
  pairs: Pair[],
  concentrationPct?: number,
  allowedConcentrations?: number[],
): CompositionResult {
  const bySlug = new Map(notes.map((n) => [n.slug, n]));
  const errors: ValidationError[] = [];
  const items = rawItems.map((i) => ({ ...i, parts: Math.round(i.parts) }));

  const seen = new Set<string>();
  for (const it of items) {
    const n = bySlug.get(it.slug);
    if (!n) {
      errors.push({ code: "UNKNOWN_NOTE", slug: it.slug });
      continue;
    }
    if (seen.has(it.slug)) errors.push({ code: "DUPLICATE_NOTE", slug: it.slug });
    seen.add(it.slug);
    if (!n.active) errors.push({ code: "INACTIVE_NOTE", slug: it.slug });
    if (n.tier && n.tier !== it.tier) errors.push({ code: "WRONG_TIER", slug: it.slug, expected: n.tier as Tier });
    if (n.isFixed) {
      const expected = n.fixedParts ?? n.minParts;
      if (it.parts !== expected) errors.push({ code: "FIXED_CHANGED", slug: it.slug });
    } else if (!Number.isFinite(it.parts) || it.parts < n.minParts || it.parts > n.maxParts) {
      errors.push({ code: "PARTS_RANGE", slug: it.slug, min: n.minParts, max: n.maxParts });
    }
  }

  // Fixed notes must be present.
  for (const n of notes) {
    if (n.isFixed && n.active && !seen.has(n.slug)) errors.push({ code: "FIXED_CHANGED", slug: n.slug });
  }

  const valid = items.filter((i) => bySlug.has(i.slug));
  const totalParts = valid.reduce((s, i) => s + Math.max(0, i.parts), 0);

  if (valid.length === 0) errors.push({ code: "EMPTY" });
  if (valid.length > rules.maxNotes) errors.push({ code: "TOO_MANY_NOTES", max: rules.maxNotes });

  const shares: Record<string, number> = {};
  const tierShares = { TOP: 0, HEART: 0, BASE: 0 } as Record<Tier, number>;
  const familyBalance = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
  const tierCount = { TOP: 0, HEART: 0, BASE: 0 } as Record<Tier, number>;

  for (const it of valid) {
    const share = totalParts > 0 ? Math.max(0, it.parts) / totalParts : 0;
    shares[it.slug] = (shares[it.slug] ?? 0) + share;
    tierShares[it.tier] += share;
    tierCount[it.tier] += 1;
    const fam = bySlug.get(it.slug)!.family as Family;
    if (fam in familyBalance) familyBalance[fam] += share;
  }

  if (valid.length > 0) {
    for (const t of TIERS) {
      if (tierCount[t] < rules.minNotesPerTier) errors.push({ code: "TIER_EMPTY", tier: t, min: rules.minNotesPerTier });
    }
  }

  for (const [slug, share] of Object.entries(shares)) {
    const n = bySlug.get(slug)!;
    if (n.maxSharePct != null && share * 100 > n.maxSharePct + 1e-9) {
      errors.push({ code: "SHARE_EXCEEDED", slug, maxPct: n.maxSharePct });
    }
  }

  for (const p of pairs) {
    if (seen.has(p.noteA) && seen.has(p.noteB)) errors.push({ code: "INCOMPATIBLE", a: p.noteA, b: p.noteB, reason: p.reason });
  }

  if (concentrationPct != null && allowedConcentrations && !allowedConcentrations.includes(concentrationPct)) {
    errors.push({ code: "BAD_CONCENTRATION", pct: concentrationPct });
  }

  return { ok: errors.length === 0, errors, items, totalParts, shares, tierShares, familyBalance };
}

/** Families ordered by weight, for "character" summaries. */
export function dominantFamilies(balance: Record<Family, number>, limit = 3): Family[] {
  return (Object.entries(balance) as [Family, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([f]) => f);
}

/** Blend of family colours, weighted by share — used for the bottle liquid. */
export function blendColor(balance: Record<Family, number>, palette: Record<Family, string>, fallback = "#E8D9B5"): string {
  let r = 0, g = 0, b = 0, w = 0;
  for (const [f, share] of Object.entries(balance) as [Family, number][]) {
    if (share <= 0) continue;
    const hex = palette[f].replace("#", "");
    r += parseInt(hex.slice(0, 2), 16) * share;
    g += parseInt(hex.slice(2, 4), 16) * share;
    b += parseInt(hex.slice(4, 6), 16) * share;
    w += share;
  }
  if (w === 0) return fallback;
  const to = (v: number) => Math.round(v / w).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
