// Fragrance families — the eight categories used in the AMAVI note list (finmodel, sheet T2_Notes).

export const FAMILIES = [
  "CITRUS",
  "FRESH",
  "FLORAL",
  "WOODY",
  "MUSKY",
  "ORIENTAL",
  "SPICY",
  "GOURMAND",
] as const;

export type Family = (typeof FAMILIES)[number];

export const TIERS = ["TOP", "HEART", "BASE"] as const;
export type Tier = (typeof TIERS)[number];

/** Colours used in the composition visualisation (bottle liquid, balance bars).
 *  Muted, warm tones so they sit on the black/cream palette. */
export const FAMILY_COLORS: Record<Family, string> = {
  CITRUS: "#D9B44A",
  FRESH: "#9DB8A0",
  FLORAL: "#D7A3A6",
  WOODY: "#9A7653",
  MUSKY: "#CFC6B8",
  ORIENTAL: "#B5733B",
  SPICY: "#B4524A",
  GOURMAND: "#7A4E35",
};

export function isFamily(v: string): v is Family {
  return (FAMILIES as readonly string[]).includes(v);
}
export function isTier(v: string): v is Tier {
  return (TIERS as readonly string[]).includes(v);
}
