import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, withFixedNotes, type NoteRule } from "./composition";
import { priceOrder, PricingError } from "./pricing";
import { matchNiche } from "./matching";
import { normalizeKzPhone, formatKzPhoneInput } from "./phone";

const N = (slug: string, family: string, tier: string, extra: Partial<NoteRule> = {}): NoteRule => ({
  slug, family, tier, isFixed: false, fixedParts: null, minParts: 1, maxParts: 10, maxSharePct: null, active: true, ...extra,
});
const notes = [
  N("bergamot", "CITRUS", "TOP"),
  N("rose", "FLORAL", "HEART"),
  N("vanilla", "ORIENTAL", "BASE"),
  N("amber", "ORIENTAL", "BASE", { maxSharePct: 40 }),
  N("white-musk", "MUSKY", "BASE", { isFixed: true, fixedParts: 2 }),
];
const rules = { maxNotes: 5, minNotesPerTier: 1, verified: false };

test("valid composition with fixed note", () => {
  const items = withFixedNotes(
    [{ slug: "bergamot", parts: 3, tier: "TOP" }, { slug: "rose", parts: 3, tier: "HEART" }, { slug: "vanilla", parts: 2, tier: "BASE" }],
    notes,
  );
  const r = evaluate(items, notes, rules, [], 20, [15, 20, 25]);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.totalParts, 10);
  assert.equal(Math.round(r.shares["white-musk"] * 100), 20);
  assert.equal(Math.round(r.familyBalance.ORIENTAL * 100), 20);
});

test("detects tier, range, share, fixed, pair and concentration errors", () => {
  const r = evaluate(
    [
      { slug: "bergamot", parts: 11, tier: "HEART" },
      { slug: "amber", parts: 9, tier: "BASE" },
      { slug: "white-musk", parts: 5, tier: "BASE" },
    ],
    notes,
    rules,
    [{ noteA: "bergamot", noteB: "amber", reason: "test" }],
    30,
    [15, 20, 25],
  );
  const codes = r.errors.map((e) => e.code).sort();
  for (const c of ["WRONG_TIER", "PARTS_RANGE", "FIXED_CHANGED", "INCOMPATIBLE", "BAD_CONCENTRATION", "TIER_EMPTY"]) {
    assert.ok(codes.includes(c as never), `missing ${c}: ${codes}`);
  }
  // amber 9/25 = 36% < 40 → not exceeded
  assert.ok(!codes.includes("SHARE_EXCEEDED" as never));
});

test("too many notes", () => {
  const many = Array.from({ length: 6 }, (_, i) => N(`n${i}`, "WOODY", "BASE"));
  const r = evaluate(many.map((n) => ({ slug: n.slug, parts: 1, tier: "BASE" as const })), many, rules, []);
  assert.ok(r.errors.some((e) => e.code === "TOO_MANY_NOTES"));
});

const cfg = {
  volumes: [{ ml: 10, priceKzt: 9900, active: true }, { ml: 30, priceKzt: 21900, active: true }],
  concentrations: [{ pct: 20, surchargeKzt: 0, active: true }, { pct: 25, surchargeKzt: 0, active: true }],
  giftSet: { enabled: true, bottles: 3, volumeMl: 10, priceKzt: 26900 },
};

test("pricing: docx prices, gift set and delivery", () => {
  const p = priceOrder([{ volumeMl: 10, concentrationPct: 20, qty: 3 }, { volumeMl: 30, concentrationPct: 20, qty: 1 }], cfg, 1500);
  assert.equal(p.subtotalKzt, 3 * 9900 + 21900);
  assert.equal(p.discountKzt, 29700 - 26900);
  assert.equal(p.totalKzt, 26900 + 21900 + 1500);
});

test("pricing rejects unknown volume and bad qty", () => {
  assert.throws(() => priceOrder([{ volumeMl: 50, concentrationPct: 20, qty: 1 }], cfg, 0), PricingError);
  assert.throws(() => priceOrder([{ volumeMl: 10, concentrationPct: 20, qty: 0 }], cfg, 0), PricingError);
});

test("matching ranks shared notes higher", () => {
  const res = matchNiche(
    { sandalwood: 0.5, cardamom: 0.3, cedarwood: 0.2 },
    { CITRUS: 0, FRESH: 0, FLORAL: 0, WOODY: 0.7, MUSKY: 0, ORIENTAL: 0, SPICY: 0.3, GOURMAND: 0 },
    [
      { id: "a", brand: "Le Labo", name: "Santal 33", notes: ["sandalwood", "cardamom", "cedarwood", "ambroxan"], accords: ["WOODY", "SPICY"] },
      { id: "b", brand: "X", name: "Citrus", notes: ["bergamot", "lemon"], accords: ["CITRUS"] },
    ],
    { sandalwood: "WOODY", cardamom: "SPICY", cedarwood: "WOODY", ambroxan: "MUSKY", bergamot: "CITRUS", lemon: "CITRUS" },
  );
  assert.equal(res[0].id, "a");
  assert.ok(res[0].scorePct > 70);
  assert.ok(!res.find((r) => r.id === "b"));
});

test("phone", () => {
  assert.equal(normalizeKzPhone("8 775 123 45 67"), "+77751234567");
  assert.equal(normalizeKzPhone("+7 (775) 123-45-67"), "+77751234567");
  assert.equal(normalizeKzPhone("12345"), null);
  assert.equal(formatKzPhoneInput("87751234567"), "+7 775 123 45 67");
  assert.equal(formatKzPhoneInput("+78775123456"), "+7 775 123 45 6");
  assert.equal(normalizeKzPhone("+7 8775 123 45 67"), "+77751234567");
  assert.equal(normalizeKzPhone("7751234567"), "+77751234567");
});
