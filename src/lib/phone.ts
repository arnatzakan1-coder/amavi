// Kazakhstan phone helpers: +7 7XX XXX XX XX
// After the +7 country code every KZ number starts with 7 (mobile 70x/74x/75x/77x, Almaty 727) or 6.

function localDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("7")) d = d.slice(1); // +7 / 7 country code
  if (d.startsWith("8")) d = d.slice(1); // domestic trunk prefix "8 7xx…"
  return d;
}

export function normalizeKzPhone(input: string): string | null {
  const d = localDigits(input);
  if (d.length !== 10 || !/^[67]/.test(d)) return null;
  return "+7" + d;
}

/** Formats while typing; always keeps the +7 prefix. */
export function formatKzPhoneInput(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("7")) d = d.slice(1);
  if (d.startsWith("8")) d = d.slice(1);
  d = d.slice(0, 10);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  return "+7" + (p.length ? " " + p.join(" ") : "");
}
