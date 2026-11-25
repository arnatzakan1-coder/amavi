import Link from "next/link";
import { inArray } from "drizzle-orm";
import { Lock } from "lucide-react";
import { db, schema as s } from "@/db";
import { getNotes } from "@/lib/data";
import { getFormulasForUser } from "@/lib/formulas";
import { TIERS } from "@/lib/families";
import ru from "@/i18n/ru";
import { H1 } from "@/components/admin/ui";

export default async function StudioFormulas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const [all, notes] = await Promise.all([getFormulasForUser(null), getNotes()]);
  const userIds = [...new Set(all.flatMap((f) => [f.userId, f.createdById].filter(Boolean) as string[]))];
  const users = userIds.length ? await db.select({ id: s.users.id, name: s.users.name, email: s.users.email }).from(s.users).where(inArray(s.users.id, userIds)) : [];
  const u = new Map(users.map((x) => [x.id, x]));
  const noteName = new Map(notes.map((n) => [n.slug, n.nameRu]));
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = all.filter((f) => {
    if (!q) return true;
    const c = u.get(f.userId);
    return [f.name, c?.name, c?.email].some((x) => x?.toLowerCase().includes(q));
  });

  return (
    <>
      <H1 sub="Confidential – Accessible only to authorized AMAVI perfumers and company personnel.">
        <span className="inline-flex items-center gap-3"><Lock size={28} aria-hidden /> Формулы клиентов</span>
      </H1>
      <form className="mb-6 flex gap-2 max-w-md">
        <label htmlFor="fq" className="sr-only">Поиск</label>
        <input id="fq" name="q" defaultValue={sp.q} placeholder="Клиент, email или название" className="field" />
        <button className="btn btn-ghost btn-sm">Найти</button>
      </form>
      {list.length === 0 && <p className="card p-6 text-muted">Формул нет.</p>}
      <ul className="grid gap-4 xl:grid-cols-2">
        {list.map((f) => {
          const c = u.get(f.userId);
          const total = f.items.reduce((n, i) => n + i.parts, 0) || 1;
          return (
            <li key={f.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl break-words">{f.name}</h2>
                  <p className="text-xs text-muted">
                    {c?.name ?? "—"} · {c?.email} · {f.concentrationPct}% · {f.updatedAt.toLocaleDateString("ru-RU")}
                    {f.createdById && ` · парфюмер: ${u.get(f.createdById)?.name ?? u.get(f.createdById)?.email ?? "—"}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {f.bookingId && <Link href={`/studio/bookings/${f.bookingId}`} className="btn btn-ghost btn-sm">Запись</Link>}
                  <Link href={`/create?formula=${f.id}${f.bookingId ? `&booking=${f.bookingId}` : ""}`} className="btn btn-gold btn-sm">Открыть</Link>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-sm">
                {TIERS.map((tier) => {
                  const items = f.items.filter((i) => i.tier === tier);
                  if (!items.length) return null;
                  return (
                    <div key={tier} className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-xs text-muted pt-0.5">{ru.tiers[tier]}</dt>
                      <dd>{items.map((i) => `${noteName.get(i.slug) ?? i.slug} ${i.parts} ч. (${Math.round((i.parts / total) * 100)}%)`).join(", ")}</dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
