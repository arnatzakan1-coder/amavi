"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useCart } from "@/lib/stores";
import { formatKzt } from "@/lib/pricing";
import { Dialog } from "@/components/ui/Dialog";

// Name-only view of a client's formula. It never receives the composition.
type F = { id: string; name: string; concentrationPct: number; created: string };
type O = { number: string; status: string; date: string; volumeMl: number; qty: number };

export function FormulaCard({ formula, orders, volumes }: { formula: F; orders: O[]; volumes: { ml: number; priceKzt: number }[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [ordering, setOrdering] = useState(false);

  return (
    <li className="card p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl break-words">{formula.name}</h2>
          <p className="mt-1 text-xs text-muted">
            {t.formulas.created}: {formula.created} · Eau de Parfum {formula.concentrationPct}%
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-3 text-cream" title={t.formulas.confidential || "Confidential"}>
          <Lock size={16} aria-hidden />
        </span>
      </div>

      <div className="mt-6 flex-1">
        <h3 className="font-sans text-xs uppercase tracking-[0.18em] text-muted">{t.formulas.history}</h3>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t.formulas.noOrders}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {orders.map((o) => (
              <li key={o.number + o.volumeMl}>
                <Link href={`/account/orders/${o.number}`} className="flex justify-between gap-3 py-2 hover:text-champagne">
                  <span>{o.date} · {o.volumeMl} ml × {o.qty}</span>
                  <span className="text-muted">{t.status[o.status] ?? o.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="btn btn-gold btn-sm mt-6 w-full" onClick={() => setOrdering(true)}>
        {t.formulas.reorder}
      </button>
      <p className="mt-2 text-xs text-muted text-center">{t.formulas.pickup}</p>

      {ordering && (
        <Dialog title={t.cart.chooseVolume} onClose={() => setOrdering(false)} closeLabel={t.common.close}>
          <p className="text-sm text-muted">{formula.name}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {volumes.map((v) => (
              <button
                key={v.ml}
                type="button"
                className="card p-5 text-left hover:border-cream"
                onClick={() => {
                  add({ formulaId: formula.id, formulaName: formula.name, volumeMl: v.ml, concentrationPct: formula.concentrationPct });
                  router.push("/cart");
                }}
              >
                <span className="block font-display text-4xl">{v.ml} <span className="text-xl text-muted">ml</span></span>
                <span className="block mt-2 font-semibold">{formatKzt(v.priceKzt, locale)}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </li>
  );
}
