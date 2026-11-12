import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { requireUser } from "@/lib/session";
import { getDeliveryMethods, getPaymentMethods, getPriceConfig, getVolumes, getConcentrations } from "@/lib/data";
import { paymentAvailable } from "@/lib/payments";
import { db, schema as s } from "@/db";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const { t, locale } = await getI18n();
  const [delivery, payments, config, addresses, volumes, concs] = await Promise.all([
    getDeliveryMethods(),
    getPaymentMethods(),
    getPriceConfig(),
    db.select().from(s.addresses).where(eq(s.addresses.userId, user.id)),
    getVolumes(),
    getConcentrations(),
  ]);
  const [first = "", ...rest] = (user.name ?? "").split(" ");

  return (
    <div className="container-lux py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">{t.checkout.title}</h1>
      <CheckoutForm
        config={config}
        volumes={volumes.map((v) => v.ml)}
        concentrations={concs.map((c) => c.pct)}
        delivery={delivery.map((d) => ({ code: d.code, name: pick(d, "name", locale), priceKzt: d.priceKzt ?? 0, requiresAddress: d.requiresAddress }))}
        payments={payments.map((p) => ({ code: p.code, name: pick(p, "name", locale), available: paymentAvailable(p.code, p.active) }))}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: `${a.city}, ${a.street} ${a.house}${a.apartment ? `, ${a.apartment}` : ""}`,
          isDefault: a.isDefault,
          firstName: a.firstName,
          lastName: a.lastName,
          phone: a.phone,
        }))}
        defaults={{ firstName: first, lastName: rest.join(" ") }}
      />
    </div>
  );
}
