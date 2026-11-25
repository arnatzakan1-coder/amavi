"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { useCart, useHydrated } from "@/lib/stores";
import { formatKzt, priceOrder, type PriceConfig } from "@/lib/pricing";
import { formatKzPhoneInput, normalizeKzPhone } from "@/lib/phone";
import { createOrder } from "@/app/actions/orders";
import { OrderSummary } from "./OrderSummary";

function Field({ id, label, children, error, hint }: { id: string; label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="field-label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p id={`e-${id}`} className="field-error">{error}</p>}
    </div>
  )
}

type Delivery = { code: string; name: string; priceKzt: number; requiresAddress: boolean };
type Payment = { code: string; name: string; available: boolean };
type SavedAddress = { id: string; label: string; isDefault: boolean; firstName: string; lastName: string; phone: string };

export function CheckoutForm({
  config,
  volumes,
  concentrations,
  delivery,
  payments,
  addresses,
  defaults,
}: {
  config: PriceConfig;
  volumes: number[];
  concentrations: number[];
  delivery: Delivery[];
  payments: Payment[];
  addresses: SavedAddress[];
  defaults: { firstName: string; lastName: string };
}) {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  const cart = useCart();
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];

  const [firstName, setFirstName] = useState(def?.firstName ?? defaults.firstName);
  const [lastName, setLastName] = useState(def?.lastName ?? defaults.lastName);
  const [phone, setPhone] = useState(def ? formatKzPhoneInput(def.phone) : "+7");
  const [deliveryCode, setDeliveryCode] = useState(delivery[0]?.code ?? "");
  const [paymentCode, setPaymentCode] = useState("");
  const [addressId, setAddressId] = useState<string | "new">(def?.id ?? "new");
  const [addr, setAddr] = useState({ city: "Алматы", street: "", house: "", apartment: "", comment: "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; manual: string | null } | null>(null);
  const [pending, start] = useTransition();

  const lines = useMemo(
    () =>
      cart.items
        .filter((i) => volumes.includes(i.volumeMl))
        .map((i) => (concentrations.includes(i.concentrationPct) ? i : { ...i, concentrationPct: concentrations[0] })),
    [cart.items, volumes, concentrations],
  );
  const dm = delivery.find((d) => d.code === deliveryCode);
  const usablePayments = payments.filter((p) => !(p.code === "boutique" && dm?.requiresAddress));
  const effectivePayment = usablePayments.find((p) => p.code === paymentCode && p.available) ? paymentCode : "";

  let price = null;
  try {
    if (lines.length) price = priceOrder(lines, config, dm?.priceKzt ?? 0);
  } catch {}

  if (!hydrated) return <div className="mt-8 card h-64 animate-pulse" aria-busy="true" />;

  if (done) {
    return (
      <div className="mt-10 card p-8 sm:p-12 max-w-2xl animate-fade-up" role="status">
        <CheckCircle2 size={36} className="text-ok" aria-hidden />
        <h2 className="mt-5 text-4xl">{t.checkout.successTitle}</h2>
        <p className="mt-3 text-cream/80">{fmt(t.checkout.successText, { number: done.number })}</p>
        <p className="mt-3 text-sm text-muted">
          {done.manual === "boutique" ? t.checkout.payAtBoutique : done.manual === "kaspi_invoice" ? t.checkout.kaspiInvoice : t.checkout.paymentPending}
        </p>
        <p className="mt-2 text-sm text-muted">{t.checkout.perfumerReview}</p>
        <Link href={`/account/orders/${done.number}`} className="btn btn-gold mt-8">{t.account.details}</Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 card p-10 text-center">
        <p className="text-cream/75">{t.cart.empty}</p>
        <Link href="/formulas" className="btn btn-gold mt-6">{t.cart.toCreator}</Link>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t.common.required;
    if (!lastName.trim()) e.lastName = t.common.required;
    if (!normalizeKzPhone(phone)) e.phone = t.checkout.phoneInvalid;
    if (dm?.requiresAddress && addressId === "new") {
      if (!addr.city.trim()) e.city = t.common.required;
      if (!addr.street.trim()) e.street = t.common.required;
      if (!addr.house.trim()) e.house = t.common.required;
    }
    if (!effectivePayment) e.payment = t.common.required;
    if (!consent) e.consent = t.checkout.consentRequired;
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`f-${first}`)?.focus();
    }
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    start(async () => {
      const res = await createOrder({
        lines: lines.map((l) => ({ formulaId: l.formulaId, volumeMl: l.volumeMl, concentrationPct: l.concentrationPct, qty: l.qty })),
        deliveryCode,
        paymentCode: effectivePayment,
        firstName,
        lastName,
        phone,
        addressId: dm?.requiresAddress && addressId !== "new" ? addressId : null,
        address: dm?.requiresAddress
          ? addressId === "new"
            ? addr
            : { city: "-", street: "-", house: "-", apartment: "", comment: addr.comment }
          : null,
        saveAddress,
        consent,
      });
      if (!res.ok) {
        setServerError(t.checkout.errors[res.error] ?? t.common.error);
        return;
      }
      cart.clear();
      if (res.redirectUrl) window.location.assign(res.redirectUrl);
      else setDone({ number: res.number, manual: res.manual });
    });
  };

  const inputProps = (id: string) => ({ id: `f-${id}`, "aria-invalid": errors[id] ? true : undefined, "aria-describedby": errors[id] ? `e-${id}` : undefined, className: "field" });

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px] items-start">
      <div className="space-y-6">
        {/* Recipient */}
        <fieldset className="card p-5 sm:p-7">
          <legend className="font-display text-2xl px-1">{t.checkout.contact}</legend>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <Field id="firstName" label={t.checkout.firstName} error={errors.firstName}>
              <input {...inputProps("firstName")} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} />
            </Field>
            <Field id="lastName" label={t.checkout.lastName} error={errors.lastName}>
              <input {...inputProps("lastName")} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="phone" label={t.checkout.phone} error={errors.phone} hint={t.checkout.phoneHint}>
                <input
                  {...inputProps("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatKzPhoneInput(e.target.value))}
                  onBlur={() => setErrors((er) => ({ ...er, phone: normalizeKzPhone(phone) ? "" : t.checkout.phoneInvalid }))}
                />
              </Field>
            </div>
          </div>
        </fieldset>

        {/* Delivery */}
        <fieldset className="card p-5 sm:p-7">
          <legend className="font-display text-2xl px-1">{t.checkout.delivery}</legend>
          <p className="mt-2 text-sm text-muted">{t.checkout.reorderOnly}</p>
          <div className="mt-4 grid gap-2">
            {delivery.map((d) => (
              <label key={d.code} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${deliveryCode === d.code ? "border-champagne" : "border-line"}`}>
                <input type="radio" name="delivery" className="accent-[#2c0a71] h-4 w-4" checked={deliveryCode === d.code} onChange={() => setDeliveryCode(d.code)} />
                <span className="flex-1">{d.name}</span>
                <span className="text-sm text-muted tabular-nums">{d.priceKzt ? formatKzt(d.priceKzt, locale) : "0 ₸"}</span>
              </label>
            ))}
          </div>

          {dm?.requiresAddress && (
            <div className="mt-6">
              <h3 className="text-xl">{t.checkout.address}</h3>
              {addresses.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {addresses.map((a) => (
                    <label key={a.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${addressId === a.id ? "border-champagne" : "border-line"}`}>
                      <input type="radio" name="addr" className="accent-[#2c0a71] h-4 w-4" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span className="text-sm">{a.label}</span>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${addressId === "new" ? "border-champagne" : "border-line"}`}>
                    <input type="radio" name="addr" className="accent-[#2c0a71] h-4 w-4" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                    <span className="text-sm">{t.checkout.newAddress}</span>
                  </label>
                </div>
              )}
              {addressId === "new" && (
                <div className="mt-4 grid sm:grid-cols-6 gap-4">
                  <div className="sm:col-span-6">
                    <Field id="city" label={t.checkout.city} error={errors.city}>
                      <input {...inputProps("city")} autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} maxLength={80} />
                    </Field>
                  </div>
                  <div className="sm:col-span-4">
                    <Field id="street" label={t.checkout.street} error={errors.street}>
                      <input {...inputProps("street")} autoComplete="address-line1" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} maxLength={120} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="house" label={t.checkout.house} error={errors.house}>
                      <input {...inputProps("house")} value={addr.house} onChange={(e) => setAddr({ ...addr, house: e.target.value })} maxLength={20} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="apartment" label={`${t.checkout.apartment} (${t.common.optional})`}>
                      <input {...inputProps("apartment")} autoComplete="address-line2" value={addr.apartment} onChange={(e) => setAddr({ ...addr, apartment: e.target.value })} maxLength={20} />
                    </Field>
                  </div>
                  <div className="sm:col-span-6">
                    <label className="flex items-center gap-3 text-sm text-cream/80 cursor-pointer">
                      <input type="checkbox" className="accent-[#2c0a71] h-4 w-4" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      {t.checkout.saveAddress}
                    </label>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <Field id="comment" label={`${t.checkout.comment} (${t.common.optional})`}>
                  <textarea {...inputProps("comment")} rows={2} value={addr.comment} onChange={(e) => setAddr({ ...addr, comment: e.target.value })} maxLength={300} />
                </Field>
              </div>
            </div>
          )}
        </fieldset>

        {/* Payment */}
        <fieldset className="card p-5 sm:p-7" aria-describedby={errors.payment ? "e-payment" : undefined}>
          <legend className="font-display text-2xl px-1">{t.checkout.payment}</legend>
          <div className="mt-4 grid gap-2">
            {usablePayments.map((p, i) => (
              <label
                key={p.code}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${p.available ? "cursor-pointer" : "opacity-50 cursor-not-allowed"} ${effectivePayment === p.code ? "border-champagne" : "border-line"}`}
              >
                <input
                  id={i === 0 ? "f-payment" : undefined}
                  type="radio"
                  name="payment"
                  className="accent-[#2c0a71] h-4 w-4"
                  disabled={!p.available}
                  checked={effectivePayment === p.code}
                  onChange={() => setPaymentCode(p.code)}
                />
                <span className="flex-1">{p.name}</span>
                {!p.available && <span className="text-xs text-muted">{t.checkout.paymentUnavailable}</span>}
              </label>
            ))}
          </div>
          {errors.payment && <p id="e-payment" className="field-error">{errors.payment}</p>}
        </fieldset>
      </div>

      <aside className="card p-6 lg:sticky lg:top-[90px] space-y-5">
        <h2 className="text-2xl">{t.checkout.summary}</h2>
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="truncate">{l.formulaName} · {l.volumeMl} ml · {l.concentrationPct}% × {l.qty}</span>
            </li>
          ))}
        </ul>
        <OrderSummary price={price} showDelivery />
        <div>
          <label className="flex items-start gap-3 text-sm text-cream/85 cursor-pointer">
            <input id="f-consent" type="checkbox" className="accent-[#2c0a71] h-4 w-4 mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={errors.consent ? true : undefined} />
            {t.checkout.consent}
          </label>
          {errors.consent && <p className="field-error">{errors.consent}</p>}
        </div>
        {serverError && <p role="alert" className="field-error">{serverError}</p>}
        <button className="btn btn-gold w-full" disabled={pending}>
          {pending ? t.checkout.placing : t.checkout.place}
        </button>
        <p className="text-xs text-muted">{t.checkout.perfumerReview}</p>
      </aside>
    </form>
  );
}
