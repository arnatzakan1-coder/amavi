import { desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { updateInquiry } from "../actions";
import { H1 } from "@/components/admin/ui";

const LABEL: Record<string, string> = { NEW: "Новая", IN_PROGRESS: "В работе", DONE: "Закрыта" };

export default async function AdminInquiries() {
  const rows = await db.select().from(s.inquiries).orderBy(desc(s.inquiries.createdAt)).limit(300);
  return (
    <>
      <H1 sub="Сообщения из формы «Задать вопрос» на странице бутика.">Заявки клиентов</H1>
      {rows.length === 0 && <p className="card p-6 text-muted">Заявок пока нет.</p>}
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className={`card p-5 ${r.status === "DONE" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-display text-xl">{r.name}</p>
                <p className="text-sm"><a className="text-champagne" href={`tel:${r.phone}`}>{r.phone}</a>{r.email && <> · <a className="text-champagne" href={`mailto:${r.email}`}>{r.email}</a></>}</p>
                <p className="text-xs text-muted">{r.createdAt.toLocaleString("ru-RU")}</p>
              </div>
              <form action={updateInquiry} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <label className="sr-only" htmlFor={`st-${r.id}`}>Статус</label>
                <select id={`st-${r.id}`} name="status" defaultValue={r.status} className="field py-2 min-h-[40px]">
                  {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm">OK</button>
              </form>
            </div>
            <p className="mt-3 text-sm text-cream/85 whitespace-pre-wrap">{r.message}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
