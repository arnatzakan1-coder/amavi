import { fmt, type Dict } from "@/i18n";
import type { ValidationError } from "@/lib/composition";

export function validationMessage(e: ValidationError, t: Dict, nameOf: (slug: string) => string): string {
  const tpl = t.validation[e.code];
  switch (e.code) {
    case "UNKNOWN_NOTE":
    case "INACTIVE_NOTE":
    case "DUPLICATE_NOTE":
    case "FIXED_CHANGED":
      return fmt(tpl, { slug: nameOf(e.slug) });
    case "WRONG_TIER":
      return fmt(tpl, { slug: nameOf(e.slug), expected: t.tiers[e.expected] });
    case "PARTS_RANGE":
      return fmt(tpl, { slug: nameOf(e.slug), min: e.min, max: e.max });
    case "TOO_MANY_NOTES":
      return fmt(tpl, { max: e.max });
    case "TIER_EMPTY":
      return fmt(tpl, { tier: t.tiers[e.tier], min: e.min });
    case "SHARE_EXCEEDED":
      return fmt(tpl, { slug: nameOf(e.slug), maxPct: e.maxPct });
    case "INCOMPATIBLE":
      return fmt(tpl, { a: nameOf(e.a), b: nameOf(e.b) }) + (e.reason ? ` ${e.reason}` : "");
    case "BAD_CONCENTRATION":
      return fmt(tpl, { pct: e.pct });
    default:
      return tpl;
  }
}
