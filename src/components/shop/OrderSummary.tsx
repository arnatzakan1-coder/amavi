"use client";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { formatKzt, type PriceBreakdown } from "@/lib/pricing";

export function OrderSummary({ price, showDelivery }: { price: PriceBreakdown | null; showDelivery: boolean }) {
  const { t, locale } = useI18n();
  if (!price) return null;
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between"><dt className="text-cream/75">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatKzt(price.subtotalKzt, locale)}</dd></div>
      {price.discountKzt > 0 && (
        <div className="flex justify-between text-ok">
          <dt>{fmt(t.cart.giftDiscount, { n: price.giftSets })}</dt>
          <dd className="tabular-nums">−{formatKzt(price.discountKzt, locale)}</dd>
        </div>
      )}
      {showDelivery && (
        <div className="flex justify-between"><dt className="text-cream/75">{t.cart.delivery}</dt><dd className="tabular-nums">{formatKzt(price.deliveryFeeKzt, locale)}</dd></div>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base">
        <dt className="font-display text-2xl">{t.cart.total}</dt>
        <dd className="font-display text-2xl text-champagne tabular-nums">{formatKzt(price.totalKzt, locale)}</dd>
      </div>
    </dl>
  );
}
