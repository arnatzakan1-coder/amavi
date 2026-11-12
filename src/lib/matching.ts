// "Which niche fragrance is mine like?" — an ALGORITHMIC estimate based on shared listed
// notes and family (accord) balance. It is not a claim that the two smell the same,
// and it never uses or reconstructs other brands' formulas.
import { FAMILIES, type Family } from "./families";

export type NicheEntry = {
  id: string;
  brand: string;
  name: string;
  notes: string[]; // AMAVI slugs in the public note list
  accords: string[]; // family codes
  imageUrl?: string | null;
  imageRightsConfirmed?: boolean;
};

export type MatchResult = {
  id: string;
  brand: string;
  name: string;
  scorePct: number;
  sharedNotes: string[];
  sharedFamilies: Family[];
  imageUrl: string | null;
};

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export function matchNiche(
  shares: Record<string, number>, // user formula: slug → share 0..1
  familyBalance: Record<Family, number>,
  catalogue: NicheEntry[],
  noteFamily: Record<string, string>,
  limit = 5,
): MatchResult[] {
  const userVec = FAMILIES.map((f) => familyBalance[f] ?? 0);
  const results: MatchResult[] = [];

  for (const n of catalogue) {
    if (n.notes.length === 0) continue;
    const shared = n.notes.filter((s) => (shares[s] ?? 0) > 0);
    const covered = shared.reduce((s, slug) => s + shares[slug], 0); // how much of MY formula is in theirs
    const coverage = shared.length / n.notes.length; // how much of THEIR listed notes I use
    const noteSim = covered + coverage === 0 ? 0 : (2 * covered * coverage) / (covered + coverage);

    const nicheFam = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
    for (const s of n.notes) {
      const f = noteFamily[s] as Family | undefined;
      if (f && f in nicheFam) nicheFam[f] += 1;
    }
    for (const a of n.accords) if (a in nicheFam) nicheFam[a as Family] += 1;
    const famSim = cosine(userVec, FAMILIES.map((f) => nicheFam[f]));

    const score = 0.65 * noteSim + 0.35 * famSim;
    const sharedFamilies = FAMILIES.filter((f) => (familyBalance[f] ?? 0) > 0.08 && nicheFam[f] > 0);

    results.push({
      id: n.id,
      brand: n.brand,
      name: n.name,
      scorePct: Math.round(score * 100),
      sharedNotes: shared,
      sharedFamilies,
      imageUrl: n.imageRightsConfirmed && n.imageUrl ? n.imageUrl : null,
    });
  }

  return results
    .filter((r) => r.scorePct > 0 && (r.sharedNotes.length > 0 || r.sharedFamilies.length > 0))
    .sort((a, b) => b.scorePct - a.scorePct)
    .slice(0, limit);
}
