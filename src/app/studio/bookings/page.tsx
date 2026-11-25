import Link from "next/link";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { currentUser } from "@/lib/session";
import { getPerfumers } from "@/lib/data";
import { fmtHHMM, utcToAlmaty } from "@/lib/booking";
import ru from "@/i18n/ru";
import { H1 } from "@/components/admin/ui";

const ST = ru.booking.status;

export default async function StudioBookings({ searchParams }: { searchParams: Promise<{ view?: string; p?: string }> }) {
  const sp = await searchParams;
  const me = (await currentUser())!;
  const perfumers = await getPerfumers(false);
  const mine = perfumers.find((p) => p.userId === me.id);
  const pid = sp.p ?? (mine ? mine.id : "all");
  const past = sp.view === "past";
  const now = new Date(Date.now() - 2 * 3_600_000);
  const conds = [past ? lt(s.bookings.startsAt, now) : gte(s.bookings.startsAt, now)];
  if (pid !== "all") conds.push(eq(s.bookings.perfumerId, pid));
  const rows = await db
    .select({ b: s.bookings, perfumer: s.perfumers.name, email: s.users.email })
    .from(s.bookings)
    .innerJoin(s.perfumers, eq(s.perfumers.id, s.bookings.perfumerId))
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .where(and(...conds))
    .orderBy(past ? desc(s.bookings.startsAt) : asc(s.bookings.startsAt))
    .limit(300);

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const d = utcToAlmaty(+r.b.startsAt).day;
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const q = (o: Record<string, string>) => `?${new URLSearchParams({ view: past ? "past" : "upcoming", p: pid, ...o })}`;
  const dayTitle = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, dd, 12)).toLocaleDateString("ru-RU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <>
      <H1 sub="Анкета клиента видна до консультации. После сессии откройте конструктор из записи — формула сохранится за клиентом.">Записи на консультацию</H1>
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={q({ view: "upcoming" })} className={`btn btn-sm ${!past ? "btn-gold" : "btn-ghost"}`}>Предстоящие</Link>
        <Link href={q({ view: "past" })} className={`btn btn-sm ${past ? "btn-gold" : "btn-ghost"}`}>Прошедшие</Link>
        <span className="w-px bg-line mx-1" aria-hidden />
        <Link href={q({ p: "all" })} className={`btn btn-sm ${pid === "all" ? "btn-gold" : "btn-ghost"}`}>Все парфюмеры</Link>
        {perfumers.map((p) => (
          <Link key={p.id} href={q({ p: p.id })} className={`btn btn-sm ${pid === p.id ? "btn-gold" : "btn-ghost"}`}>{p.name}</Link>
        ))}
      </div>
      {rows.length === 0 && <p className="card p-6 text-muted">Записей нет.</p>}
      <div className="space-y-8">
        {[...byDay.entries()].map(([day, list]) => (
          <section key={day}>
            <h2 className="text-2xl capitalize">{dayTitle(day)}</h2>
            <ul className="mt-3 grid gap-2">
              {list.map(({ b, perfumer, email }) => (
                <li key={b.id}>
                  <Link href={`/studio/bookings/${b.id}`} className="card p-4 grid gap-2 sm:grid-cols-[90px_1fr_1fr_auto] sm:items-center hover:border-cream">
                    <span className="font-display text-2xl">{fmtHHMM(utcToAlmaty(+b.startsAt).minutes)}</span>
                    <span>
                      <span className="block font-medium">{b.contactName}</span>
                      <span className="block text-xs text-muted">{b.contactPhone} · {email}</span>
                    </span>
                    <span className="text-sm">{perfumer} · {b.volumeMl} мл<span className="block text-xs text-muted">{b.number}</span></span>
                    <span className={`chip ${b.status === "CONFIRMED" ? "bg-cream text-ink-2" : b.status === "CANCELLED" ? "line-through" : ""}`}>{ST[b.status] ?? b.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
