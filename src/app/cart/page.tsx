import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getPriceConfig, getVolumes, getConcentrations } from "@/lib/data";
import { CartView } from "@/components/shop/CartView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.cart.title };
}

export default async function CartPage() {
  const { t } = await getI18n();
  const [config, volumes, concs] = await Promise.all([getPriceConfig(), getVolumes(), getConcentrations()]);
  return (
    <div className="container-lux py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">{t.cart.title}</h1>
      <CartView config={config} volumes={volumes.map((v) => v.ml)} concentrations={[...concs].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).map((c) => c.pct)} />
    </div>
  );
}
