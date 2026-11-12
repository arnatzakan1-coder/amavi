import ru, { type Dict } from "./ru";
import kk from "./kk";
import en from "./en";

export const LOCALES = ["ru", "kk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "amavi_locale";
export const LOCALE_LABELS: Record<Locale, string> = { ru: "Рус", kk: "Қаз", en: "Eng" };

const dicts: Record<Locale, Dict> = { ru, kk, en };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function getDict(locale: Locale): Dict {
  return dicts[locale];
}

/** Replace {placeholders}. */
export function fmt(template: string, params: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Pick a localized DB field: nameRu / nameKk / nameEn. */
export function pick<T extends Record<string, unknown>>(row: T, base: string, locale: Locale): string {
  const suffix = locale === "ru" ? "Ru" : locale === "kk" ? "Kk" : "En";
  const v = row[`${base}${suffix}`] ?? row[`${base}Ru`] ?? row[`${base}En`];
  return typeof v === "string" ? v : "";
}

export type { Dict };
