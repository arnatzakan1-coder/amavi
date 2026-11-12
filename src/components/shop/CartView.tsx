"use client";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useCart, useHydrated } from "@/lib/stores";
import { formatKzt, priceOrder, type PriceConfig } from "@/lib/pricing";
import { OrderSummary } from "./OrderSummary";

export function CartView({ config, volumes, concentrations }: { config: PriceConfig; volumes: number[]; concentrations: number[] }) {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  const { items, setQty, setVolume, remove } = useCart();

  if (!hydrated) return <div className="mt-8 card h-48 animate-pulse" aria-busy="true" />;

  // Items saved at a retired concentration are shown (and ordered) at the current one.
  const valid = items
    .filter((i) => volumes.includes(i.volumeMl))
    .map((i) => (concentrations.includes(i.concentrationPct) ? i : { ...i, concentrationPct: concentrations[0] }));
  if (valid.length === 0) {
    return (
      <div className="mt-10 card p-10 text-center">
        <p className="text-cream/75">{t.cart.empty}</p>
        <Link href="/create" className="btn btn-gold mt-6">{t.cart.toCreator}</Link>
      </div>
    );
  }

  let price = null;
  try {
    price = priceOrder(valid, config, 0);
  } catch {}
  const unit = (ml: number, pct: number) =>
    (config.volumes.find((v) => v.ml === ml)?.priceKzt ?? 0) + (config.concentrations.find((c) => c.pct === pct)?.surchargeKzt ?? 0);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] items-start">
      <ul className="space-y-3">
        {valid.map((i) => (
          <li key={i.key} className="card p-4 sm:p-5 grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="min-w-0">
              <p className="font-display text-2xl truncate">{i.formulaName}</p>
              <p className="text-xs text-muted mt-1">{t.cart.concentration}: {i.concentrationPct}% · {formatKzt(unit(i.volumeMl, i.concentrationPct), locale)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div role="group" aria-label={t.cart.volume} className="flex gap-1.5">
                  {volumes.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      aria-pressed={i.volumeMl === ml}
                      onClick={() => setVolume(i.key, ml)}
                      className={`chip min-h-[36px] px-3 ${i.volumeMl === ml ? "bg-champagne text-ink border-champagne" : "hover:text-cream"}`}
                    >
                      {ml} ml
                    </button>
                  ))}
                </div>
                <div className="flex items-center rounded-full border border-line" role="group" aria-label={t.cart.qty}>
                  <button type="button" className="h-10 w-10 grid place-items-center disabled:opacity-30" onClick={() => setQty(i.key, i.qty - 1)} disabled={i.qty <= 1} aria-label="−1">
                    <Minus size={14} aria-hidden />
                  </button>
                  <span className="w-8 text-center tabular-nums" aria-live="polite">{i.qty}</span>
                  <button type="button" className="h-10 w-10 grid place-items-center disabled:opacity-30" onClick={() => setQty(i.key, i.qty + 1)} disabled={i.qty >= 20} aria-label="+1">
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button type="button" onClick={() => remove(i.key)} className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-danger hover:bg-ink-3" aria-label={`${t.cart.remove}: ${i.formulaName}`}>
                <X size={18} aria-hidden />
              </button>
              <p className="tabular-nums text-champagne">{formatKzt(unit(i.volumeMl, i.concentrationPct) * i.qty, locale)}</p>
            </div>
          </li>
        ))}
      </ul>
      <aside className="card p-6 lg:sticky lg:top-[90px]">
        <OrderSummary price={price} showDelivery={false} />
        <p className="mt-4 text-xs text-muted">{t.cart.priceNote}</p>
        <Link href="/checkout" className="btn btn-gold w-full mt-5">{t.cart.checkout}</Link>
      </aside>
    </div>
  );
}
