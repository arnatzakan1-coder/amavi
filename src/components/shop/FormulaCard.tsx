"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { useCart } from "@/lib/stores";
import { formatKzt } from "@/lib/pricing";
import { deleteFormula, renameFormula } from "@/app/actions/formulas";
import { FAMILY_COLORS, TIERS, type Family } from "@/lib/families";
import { Dialog } from "@/components/ui/Dialog";

type F = {
  id: string;
  name: string;
  concentrationPct: number;
  createdAt: string;
  event: string | null;
  notes: { name: string; family: string; tier: string; parts: number }[];
};

export function FormulaCard({ formula, volumes }: { formula: F; volumes: { ml: number; priceKzt: number }[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [ordering, setOrdering] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(formula.name);
  const [pending, start] = useTransition();
  const total = formula.notes.reduce((s, n) => s + n.parts, 0) || 1;

  return (
    <li className="card p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-3xl truncate">{formula.name}</h2>
          <p className="mt-1 text-xs text-muted">
            {new Date(formula.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU")} · {formula.concentrationPct}%
            {formula.event && <> · {formula.event}</>}
          </p>
        </div>
        <div className="flex shrink-0">
          <button type="button" onClick={() => setRenaming(true)} className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-cream hover:bg-ink-3" aria-label={`${t.formulas.rename}: ${formula.name}`}>
            <Pencil size={16} aria-hidden />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(fmt(t.formulas.confirmRemove, { name: formula.name }))) start(async () => { await deleteFormula(formula.id); router.refresh(); });
            }}
            className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-danger hover:bg-ink-3"
            aria-label={`${t.formulas.remove}: ${formula.name}`}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-5 flex h-2 rounded-full overflow-hidden bg-ink-3" aria-hidden>
        {formula.notes.map((n, i) => (
          <div key={i} style={{ width: `${(n.parts / total) * 100}%`, background: FAMILY_COLORS[n.family as Family] }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2 text-sm flex-1">
        {TIERS.map((tier) => {
          const list = formula.notes.filter((n) => n.tier === tier);
          if (!list.length) return null;
          return (
            <div key={tier} className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="text-muted text-xs pt-0.5">{t.tiers[tier]}</dt>
              <dd className="text-cream/85">{list.map((n) => n.name).join(", ")}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <button type="button" className="btn btn-gold btn-sm col-span-3" onClick={() => setOrdering(true)}>{t.formulas.order}</button>
        <Link href={`/create?formula=${formula.id}`} className="btn btn-ghost btn-sm col-span-3 sm:col-span-1 sm:px-2">{t.formulas.edit}</Link>
        <Link href={`/match?formula=${formula.id}`} className="btn btn-ghost btn-sm col-span-3 sm:col-span-2 sm:px-2">
          <Sparkles size={14} aria-hidden /> {t.formulas.match}
        </Link>
      </div>

      {ordering && (
        <Dialog title={t.cart.chooseVolume} onClose={() => setOrdering(false)} closeLabel={t.common.close}>
          <div className="grid grid-cols-2 gap-3">
            {volumes.map((v) => (
              <button
                key={v.ml}
                type="button"
                className="card p-5 text-left hover:border-champagne"
                onClick={() => {
                  add({ formulaId: formula.id, formulaName: formula.name, volumeMl: v.ml, concentrationPct: formula.concentrationPct });
                  router.push("/cart");
                }}
              >
                <span className="block font-display text-4xl">{v.ml} <span className="text-xl text-muted">ml</span></span>
                <span className="block mt-2 text-champagne">{formatKzt(v.priceKzt, locale)}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {renaming && (
        <Dialog title={t.formulas.rename} onClose={() => setRenaming(false)} closeLabel={t.common.close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                await renameFormula(formula.id, name);
                setRenaming(false);
                router.refresh();
              });
            }}
          >
            <label htmlFor={`rn-${formula.id}`} className="field-label">{t.creator.nameLabel}</label>
            <input id={`rn-${formula.id}`} className="field" value={name} maxLength={60} required onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-gold w-full mt-4" disabled={pending || !name.trim()}>{t.common.save}</button>
          </form>
        </Dialog>
      )}
    </li>
  );
}
