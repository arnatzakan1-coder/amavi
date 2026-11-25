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
  volumes: [{ ml: 10, priceKzt: 24000, active: true }, { ml: 30, priceKzt: 45000, active: true }],
  concentrations: [{ pct: 20, surchargeKzt: 0, active: true }],
  giftSet: { enabled: false, bottles: 3, volumeMl: 10, priceKzt: 0 },
};

test("pricing: presentation prices, studio pickup, no set discount", () => {
  const p = priceOrder([{ volumeMl: 10, concentrationPct: 20, qty: 3 }, { volumeMl: 30, concentrationPct: 20, qty: 1 }], cfg, 0);
  assert.equal(p.subtotalKzt, 3 * 24000 + 45000);
  assert.equal(p.discountKzt, 0);
  assert.equal(p.totalKzt, 117000);
});

test("pricing rejects unknown volume and bad qty", () => {
  assert.throws(() => priceOrder([{ volumeMl: 10, concentrationPct: 15, qty: 1 }], cfg, 0), PricingError);
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
  assert.equal(normalizeKzPhone("87765518509"), "+77765518509");
});

import { almatyToUtc, utcToAlmaty, slotStarts, slotState, upcomingDays, depositFor } from "./booking";

test("booking: Almaty time conversions and slots", () => {
  // 10:00 Almaty = 05:00 UTC
  const t = almatyToUtc("2027-03-01", 600);
  assert.equal(new Date(t).toISOString(), "2027-03-01T05:00:00.000Z");
  assert.deepEqual(utcToAlmaty(t), { day: "2027-03-01", minutes: 600, isoWeekday: 1 });
  // 90-minute slots between 10:00 and 21:00 → last one 19:00–20:30
  assert.deepEqual(slotStarts({ slotMinutes: 90, opensAt: "10:00", closesAt: "21:00" }), [600, 690, 780, 870, 960, 1050, 1140]);
  // 23:30 UTC on 28 Feb is already 1 March in Almaty
  assert.equal(upcomingDays(Date.UTC(2027, 1, 28, 23, 30), 2)[0], "2027-03-01");
  assert.equal(depositFor(45000, 50), 22500);
});

test("booking: slot states", () => {
  const p = { id: "p", workDays: "1,2,3,4,5", startTime: "10:00", endTime: "21:00", daysOff: "2027-03-03" };
  const cfg = { slotMinutes: 90, minLeadHours: 2 };
  const now = almatyToUtc("2027-03-01", 9 * 60); // Monday 09:00
  const booked = new Set([almatyToUtc("2027-03-01", 780)]);
  assert.equal(slotState(p, "2027-03-01", 600, cfg, booked, now), "past"); // within 2 h
  assert.equal(slotState(p, "2027-03-01", 690, cfg, booked, now), "free");
  assert.equal(slotState(p, "2027-03-01", 780, cfg, booked, now), "booked");
  assert.equal(slotState(p, "2027-03-03", 690, cfg, booked, now), "off"); // day off
  assert.equal(slotState(p, "2027-03-06", 690, cfg, booked, now), "off"); // Saturday not a work day
});

import { PRICES, CONCENTRATION_PCT, BOUTIQUE, PERFUMERS } from "../db/studio-defaults";
import { questionnaireSchema } from "./questionnaire";

test("studio facts from the brief", () => {
  assert.deepEqual(PRICES, [{ ml: 10, priceKzt: 24000 }, { ml: 30, priceKzt: 45000 }]);
  assert.equal(CONCENTRATION_PCT, 20);
  assert.match(BOUTIQUE.addressEn, /155 Zheltoqsan/);
  assert.equal(BOUTIQUE.hours, "10:00–21:00");
  assert.equal(PERFUMERS.length, 3);
});

test("questionnaire requires age, families and purposes", () => {
  assert.equal(questionnaireSchema.safeParse({ age: 25, families: ["FLORAL"], purposes: ["EVERYDAY"] }).success, true);
  assert.equal(questionnaireSchema.safeParse({ age: 25, families: [], purposes: ["EVERYDAY"] }).success, false);
  assert.equal(questionnaireSchema.safeParse({ age: 10, families: ["FLORAL"], purposes: ["WORK"] }).success, false);
});
