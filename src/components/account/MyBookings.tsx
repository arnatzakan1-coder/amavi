"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { cancelMyBooking } from "@/app/actions/booking";

type B = { id: string; number: string; when: string; perfumer: string; volumeMl: number; status: string; deposit: string; cancellable: boolean };

export function MyBookings({ bookings }: { bookings: B[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (bookings.length === 0) return <p className="mt-4 card p-6 text-muted">{t.booking.noBookings}</p>;
  return (
    <ul className="mt-5 grid gap-3">
      {bookings.map((b) => (
        <li key={b.id} className="card p-5 grid gap-3 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center">
          <div>
            <p className="font-display text-xl uppercase">{b.when}</p>
            <p className="text-sm text-muted">{b.perfumer} · {b.volumeMl} ml · {b.number}</p>
          </div>
          <div className="text-sm">
            <span className={`chip ${b.status === "CONFIRMED" ? "bg-cream text-ink-2 border-cream" : ""}`}>{t.booking.status[b.status] ?? b.status}</span>
            {b.status === "PENDING_DEPOSIT" && <p className="mt-1 text-xs text-muted">{fmt(t.booking.deposit, { pct: 50 })}: {b.deposit}</p>}
          </div>
          {b.cancellable && (
            <button
              type="button"
              disabled={pending}
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm(fmt(t.booking.confirmCancel, { number: b.number }))) start(async () => { await cancelMyBooking(b.id); router.refresh(); });
              }}
            >
              {t.booking.cancel}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
