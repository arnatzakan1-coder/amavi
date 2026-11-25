import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Lock, Pencil, Plus } from "lucide-react";
import { db, schema as s } from "@/db";
import { formatKzt } from "@/lib/pricing";
import { BOOKING_STATUSES, fmtHHMM, utcToAlmaty } from "@/lib/booking";
import { parseQuestionnaire } from "@/lib/questionnaire";
import ru from "@/i18n/ru";
import { updateBooking } from "../../actions";
import { Saved, Textarea } from "@/components/admin/ui";

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [row] = await db
    .select({ b: s.bookings, perfumer: s.perfumers.name, email: s.users.email, userName: s.users.name })
    .from(s.bookings)
    .innerJoin(s.perfumers, eq(s.perfumers.id, s.bookings.perfumerId))
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .where(eq(s.bookings.id, id));
  if (!row) notFound();
  const { b } = row;
  const q = parseQuestionnaire(b.questionnaireJson);
  const formulas = await db
    .select({ id: s.formulas.id, name: s.formulas.name, bookingId: s.formulas.bookingId, createdAt: s.formulas.createdAt })
    .from(s.formulas)
    .where(eq(s.formulas.userId, b.userId))
    .orderBy(desc(s.formulas.createdAt));
  const a = utcToAlmaty(+b.startsAt);
  const [y, m, d] = a.day.split("-").map(Number);
  const when = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("ru-RU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2 border-b border-line last:border-0">
      <dt className="text-muted text-sm">{k}</dt>
      <dd>{v || <span className="text-muted">—</span>}</dd>
    </div>
  );

  return (
    <>
      <Link href="/studio/bookings" className="text-sm text-muted hover:text-cream">← Все записи</Link>
      <h1 className="mt-3 text-4xl">{b.contactName}</h1>
      <p className="mt-1 text-muted">{b.number} · {when}, {fmtHHMM(a.minutes)}–{fmtHHMM(a.minutes + b.durationMin)} · {row.perfumer}</p>
      <Saved show={sp.saved === "1"} />
      {sp.error === "slot" && <p className="mt-4 text-danger">Это время уже занято другой записью — статус не изменён.</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <h2 className="text-2xl flex items-center gap-2"><Lock size={18} aria-hidden /> Анкета клиента</h2>
          {q ? (
            <dl className="mt-4">
              <Row k="Возраст" v={q.age} />
              <Row k="Нравятся" v={q.families.map((f) => ru.booking.pref[f]).join(", ")} />
              <Row k="Для чего" v={q.purposes.map((p) => ru.booking.purpose[p]).join(", ")} />
              <Row k="Любит" v={q.likes} />
              <Row k="Не любит / дискомфорт" v={q.dislikes} />
              <Row k="Дополнительно" v={q.extra && <span className="whitespace-pre-wrap">{q.extra}</span>} />
              <Row k="Название аромата" v={q.perfumeName} />
            </dl>
          ) : (
            <p className="mt-3 text-muted">Анкета не читается.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-2xl">Запись</h2>
            <dl className="mt-3 text-sm">
              <Row k="Телефон" v={<a href={`tel:${b.contactPhone}`} className="underline">{b.contactPhone}</a>} />
              <Row k="Аккаунт" v={`${row.userName ?? ""} · ${row.email}`} />
              <Row k="Объём" v={`${b.volumeMl} мл`} />
              <Row k="Предоплата" v={formatKzt(b.depositKzt, "ru")} />
            </dl>
            <form action={updateBooking} className="mt-5 grid gap-4">
              <input type="hidden" name="id" value={b.id} />
              <div>
                <label htmlFor="st" className="field-label">Статус</label>
                <select id="st" name="status" defaultValue={b.status} className="field">
                  {BOOKING_STATUSES.map((x) => <option key={x} value={x}>{ru.booking.status[x]}</option>)}
                </select>
              </div>
              <Textarea label="Заметка для команды (клиент не видит)" name="staffNote" defaultValue={b.staffNote} />
              <button className="btn btn-gold btn-sm justify-self-start">Сохранить</button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl">Формулы клиента</h2>
            <p className="mt-1 text-xs text-muted">Клиент видит только название и может повторить заказ. Состав видят только сотрудники.</p>
            <ul className="mt-4 space-y-2">
              {formulas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
                  <span>
                    {f.name}
                    {f.bookingId === b.id && <span className="ml-2 chip">эта запись</span>}
                  </span>
                  <Link href={`/create?formula=${f.id}&booking=${b.id}`} className="btn btn-ghost btn-sm"><Pencil size={14} aria-hidden /> Открыть</Link>
                </li>
              ))}
            </ul>
            <Link href={`/create?booking=${b.id}`} className="btn btn-gold btn-sm mt-4"><Plus size={15} aria-hidden /> Создать формулу для клиента</Link>
          </section>
        </div>
      </div>
    </>
  );
}
