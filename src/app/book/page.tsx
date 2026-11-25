import type { Metadata } from "next";
import Link from "next/link";
import { and, gte, ne } from "drizzle-orm";
import { getI18n } from "@/i18n/server";
import { pick } from "@/i18n";
import { currentUser } from "@/lib/session";
import { db, schema as s } from "@/db";
import { getPerfumers, getSetting, getVolumes } from "@/lib/data";
import { upcomingDays } from "@/lib/booking";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.booking.title, description: t.booking.subtitle };
}

export default async function BookPage() {
  const { t, locale } = await getI18n();
  const [user, cfg, perfumers, volumes, boutique] = await Promise.all([
    currentUser(),
    getSetting("booking"),
    getPerfumers(),
    getVolumes(),
    getSetting("boutique"),
  ]);
  const now = Date.now();
  // Only perfumer + start time leave the server — never who booked.
  const taken = await db
    .select({ perfumerId: s.bookings.perfumerId, startsAt: s.bookings.startsAt })
    .from(s.bookings)
    .where(and(ne(s.bookings.status, "CANCELLED"), gte(s.bookings.startsAt, new Date(now - 86_400_000))));

  return (
    <div className="container-lux py-10 sm:py-14">
      <p className="eyebrow">{pick(boutique, "address", locale)}{boutique.hours ? ` · ${boutique.hours}, ${t.boutique.daily}` : ""}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{t.booking.title}</h1>
      <p className="mt-4 text-muted max-w-2xl">{t.booking.subtitle}</p>

      {!user ? (
        <div className="mt-10 card p-8 sm:p-10 max-w-2xl">
          <p>{t.booking.loginFirst}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/book" className="btn btn-gold">{t.nav.login}</Link>
            <Link href="/register?next=/book" className="btn btn-ghost">{t.auth.register}</Link>
          </div>
        </div>
      ) : (
        <BookingFlow
          nowMs={now}
          cfg={cfg}
          days={upcomingDays(now, cfg.horizonDays)}
          perfumers={perfumers.map((p) => ({ id: p.id, name: p.name, workDays: p.workDays, startTime: p.startTime, endTime: p.endTime, daysOff: p.daysOff }))}
          taken={taken.map((b) => ({ perfumerId: b.perfumerId, startsAt: +b.startsAt }))}
          volumes={volumes.map((v) => ({ ml: v.ml, priceKzt: v.priceKzt }))}
          contact={{ name: user.name ?? "", phone: user.phone ?? "" }}
        />
      )}
    </div>
  );
}
