"use client";
import { useI18n } from "@/i18n/client";
import { FAMILIES, FAMILY_COLORS, type Family } from "@/lib/families";

export function Balance({ balance }: { balance: Record<Family, number> }) {
  const { t } = useI18n();
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  return (
    <div className="mt-4">
      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-ink-3" aria-hidden>
        {FAMILIES.map((f) =>
          balance[f] > 0 ? <div key={f} style={{ width: `${balance[f] * 100}%`, background: FAMILY_COLORS[f] }} className="transition-[width] duration-500" /> : null,
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {FAMILIES.map((f) => {
          const pct = Math.round(balance[f] * 100);
          return (
            <div key={f} className={`flex items-center justify-between text-sm ${total > 0 && pct === 0 ? "opacity-40" : ""}`}>
              <dt className="flex items-center gap-2 text-cream/85">
                <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[f] }} aria-hidden />
                {t.families[f]}
              </dt>
              <dd className="tabular-nums text-muted">{pct}%</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
