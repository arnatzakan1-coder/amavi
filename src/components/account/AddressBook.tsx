"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { addAddress, deleteAddress, makeDefaultAddress, type AddressState } from "@/app/actions/account";
import { formatKzPhoneInput } from "@/lib/phone";

type A = { id: string; label: string; line: string; isDefault: boolean };

export function AddressBook({ addresses }: { addresses: A[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("+7");
  const [state, action, pending] = useActionState<AddressState, FormData>(addAddress, undefined);
  const [busy, start] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setPhone("+7");
    }
  }, [state]);

  return (
    <div className="mt-5">
      {addresses.length === 0 && !open && <p className="card p-6 text-cream/75">{t.account.noAddresses}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="card p-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{a.line}</p>
              <p className="mt-1 text-xs text-muted">{a.label}</p>
              {a.isDefault && <span className="chip mt-3 text-champagne border-gold/50">{t.account.default}</span>}
            </div>
            <div className="flex shrink-0">
              {!a.isDefault && (
                <button type="button" disabled={busy} onClick={() => start(() => makeDefaultAddress(a.id))} className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-champagne hover:bg-ink-3" aria-label={t.account.makeDefault}>
                  <Star size={16} aria-hidden />
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => start(() => deleteAddress(a.id))} className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-danger hover:bg-ink-3" aria-label={`${t.common.delete}: ${a.line}`}>
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {open ? (
        <form action={action} className="mt-5 card p-5 sm:p-7 grid sm:grid-cols-6 gap-4">
          {[
            ["firstName", t.checkout.firstName, "given-name", 3],
            ["lastName", t.checkout.lastName, "family-name", 3],
            ["city", t.checkout.city, "address-level2", 6],
            ["street", t.checkout.street, "address-line1", 4],
            ["house", t.checkout.house, "", 2],
            ["apartment", `${t.checkout.apartment} (${t.common.optional})`, "address-line2", 2],
          ].map(([name, label, ac, span]) => (
            <div key={name as string} style={{ gridColumn: `span ${span} / span ${span}` }} className="max-sm:!col-span-6">
              <label htmlFor={`ab-${name}`} className="field-label">{label}</label>
              <input
                id={`ab-${name}`}
                name={name as string}
                className="field"
                autoComplete={(ac as string) || undefined}
                required={name !== "apartment"}
                defaultValue={name === "city" ? "Алматы" : undefined}
                maxLength={120}
              />
            </div>
          ))}
          <div className="sm:col-span-4 max-sm:col-span-6">
            <label htmlFor="ab-phone" className="field-label">{t.checkout.phone}</label>
            <input id="ab-phone" name="phone" type="tel" inputMode="tel" className="field" value={phone} onChange={(e) => setPhone(formatKzPhoneInput(e.target.value))} required />
          </div>
          <div className="sm:col-span-6">
            <label htmlFor="ab-comment" className="field-label">{t.checkout.comment} ({t.common.optional})</label>
            <input id="ab-comment" name="comment" className="field" maxLength={300} />
          </div>
          {state?.error && <p role="alert" className="field-error sm:col-span-6">{state.error === "PHONE" ? t.checkout.phoneInvalid : t.checkout.errors.INPUT}</p>}
          <div className="sm:col-span-6 flex gap-2">
            <button className="btn btn-gold btn-sm" disabled={pending}>{t.common.save}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t.common.cancel}</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm mt-5" onClick={() => setOpen(true)}>
          <Plus size={14} aria-hidden /> {t.account.addAddress}
        </button>
      )}
    </div>
  );
}
