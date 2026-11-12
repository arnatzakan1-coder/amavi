"use client";
import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { sendInquiry, type InquiryState } from "@/app/actions/inquiry";
import { formatKzPhoneInput } from "@/lib/phone";

export function InquiryForm() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("+7");
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, undefined);
  if (state?.ok) return <p role="status" className="card p-8 text-ok">{t.boutique.sent}</p>;
  return (
    <form action={action} className="card p-6 sm:p-8 grid sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="iq-name" className="field-label">{t.auth.name}</label>
        <input id="iq-name" name="name" required maxLength={80} autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="iq-phone" className="field-label">{t.checkout.phone}</label>
        <input id="iq-phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" className="field" value={phone} onChange={(e) => setPhone(formatKzPhoneInput(e.target.value))} aria-invalid={state?.error === "PHONE" ? true : undefined} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="iq-email" className="field-label">{t.auth.email} ({t.common.optional})</label>
        <input id="iq-email" name="email" type="email" autoComplete="email" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="iq-msg" className="field-label">{t.boutique.message}</label>
        <textarea id="iq-msg" name="message" required rows={4} maxLength={1500} className="field" />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state?.error && (
        <p role="alert" className="field-error sm:col-span-2">
          {state.error === "PHONE" ? t.checkout.phoneInvalid : state.error === "RATE" ? t.common.error : t.checkout.errors.INPUT}
        </p>
      )}
      <p className="text-xs text-muted sm:col-span-2">{t.checkout.consent}.</p>
      <button className="btn btn-gold sm:col-span-2 sm:justify-self-start" disabled={pending}>{t.boutique.send}</button>
    </form>
  );
}
