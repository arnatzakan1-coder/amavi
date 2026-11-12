"use client";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useCart } from "@/lib/stores";

type Item = { formulaId: string; formulaName: string; volumeMl: number; concentrationPct: number; qty: number };

export function ReorderButton({ items }: { items: Item[] }) {
  const { t } = useI18n();
  const add = useCart((s) => s.add);
  const router = useRouter();
  if (!items.length) return null;
  return (
    <button
      type="button"
      className="btn btn-gold w-full mt-6"
      onClick={() => {
        for (const i of items) add({ formulaId: i.formulaId, formulaName: i.formulaName, volumeMl: i.volumeMl, concentrationPct: i.concentrationPct }, i.qty);
        router.push("/cart");
      }}
    >
      <RotateCcw size={15} aria-hidden /> {t.account.reorder}
    </button>
  );
}
