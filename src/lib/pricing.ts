// Order pricing. Runs on the server for every checkout — client totals are display-only.

export type PriceConfig = {
  volumes: { ml: number; priceKzt: number; active: boolean }[];
  concentrations: { pct: number; surchargeKzt: number; active: boolean }[];
  giftSet: { enabled: boolean; bottles: number; volumeMl: number; priceKzt: number } | null;
};

export type PriceLine = { volumeMl: number; concentrationPct: number; qty: number };

export type PricedLine = PriceLine & { unitPriceKzt: number; lineTotalKzt: number };

export type PriceBreakdown = {
  lines: PricedLine[];
  subtotalKzt: number;
  discountKzt: number;
  giftSets: number;
  deliveryFeeKzt: number;
  totalKzt: number;
};

export class PricingError extends Error {}

export const MAX_QTY = 20;

export function priceOrder(lines: PriceLine[], cfg: PriceConfig, deliveryFeeKzt: number): PriceBreakdown {
  if (lines.length === 0) throw new PricingError("EMPTY_CART");
  const priced: PricedLine[] = lines.map((l) => {
    const vol = cfg.volumes.find((v) => v.ml === l.volumeMl && v.active);
    if (!vol) throw new PricingError("VOLUME_UNAVAILABLE");
    const conc = cfg.concentrations.find((c) => c.pct === l.concentrationPct && c.active);
    if (!conc) throw new PricingError("CONCENTRATION_UNAVAILABLE");
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) throw new PricingError("BAD_QTY");
    const unit = vol.priceKzt + conc.surchargeKzt;
    return { ...l, unitPriceKzt: unit, lineTotalKzt: unit * l.qty };
  });

  const subtotal = priced.reduce((s, l) => s + l.lineTotalKzt, 0);

  // Gift set (docx §4.1): every N bottles of the set volume are charged at the set price.
  let discount = 0;
  let sets = 0;
  const gs = cfg.giftSet;
  if (gs?.enabled && gs.bottles > 0) {
    const eligible = priced.filter((l) => l.volumeMl === gs.volumeMl);
    const units = eligible.flatMap((l) => Array(l.qty).fill(l.unitPriceKzt) as number[]).sort((a, b) => a - b);
    sets = Math.floor(units.length / gs.bottles);
    for (let i = 0; i < sets; i++) {
      const group = units.slice(i * gs.bottles, (i + 1) * gs.bottles);
      const regular = group.reduce((s, v) => s + v, 0);
      discount += Math.max(0, regular - gs.priceKzt);
    }
  }

  return {
    lines: priced,
    subtotalKzt: subtotal,
    discountKzt: discount,
    giftSets: sets,
    deliveryFeeKzt,
    totalKzt: subtotal - discount + deliveryFeeKzt,
  };
}

export function formatKzt(v: number, locale = "ru") {
  const loc = locale === "en" ? "en-US" : locale === "kk" ? "kk-KZ" : "ru-RU";
  return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(v).replace(/,/g, " ") + " ₸";
}
