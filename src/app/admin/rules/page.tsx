import { getNotes, getSetting } from "@/lib/data";
import { db, schema as s } from "@/db";
import { addPair, deletePair, updateRules } from "../actions";
import { H1, Saved, Input, Check, Submit } from "@/components/admin/ui";

export default async function AdminRules({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const [rules, notes, pairs] = await Promise.all([getSetting("rules"), getNotes(), db.select().from(s.incompatiblePairs)]);
  const name = (slug: string) => notes.find((n) => n.slug === slug)?.nameRu ?? slug;
  return (
    <>
      <H1 sub="Правила безопасности и допустимые концентрации задаёт квалифицированный парфюмер. Пока галочка «подтверждено» не стоит, клиенты видят пометку, а каждый заказ проходит проверку парфюмером.">Правила формул</H1>
      <Saved show={sp.saved === "1"} />
      <form action={updateRules} className="card p-6 grid gap-5 sm:grid-cols-3 items-end">
        <Input label="Максимум нот в композиции" name="maxNotes" type="number" defaultValue={rules.maxNotes} />
        <Input label="Минимум нот на каждом уровне" name="minNotesPerTier" type="number" defaultValue={rules.minNotesPerTier} />
        <Check label="Правила подтверждены парфюмером" name="verified" defaultChecked={rules.verified} />
        <div className="sm:col-span-3"><Submit /></div>
      </form>

      <section className="mt-8 card p-6">
        <h2 className="text-2xl">Несовместимые сочетания</h2>
        <p className="mt-1 text-sm text-muted">Конструктор не позволит сохранить или заказать формулу с этими парами.</p>
        <ul className="mt-4 divide-y divide-line">
          {pairs.length === 0 && <li className="py-3 text-sm text-muted">Пока не задано.</li>}
          {pairs.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-4 text-sm">
              <span>{name(p.noteA)} + {name(p.noteB)}{p.reason && <span className="text-muted"> — {p.reason}</span>}</span>
              <form action={deletePair}><input type="hidden" name="id" value={p.id} /><button className="text-danger underline underline-offset-4">Удалить</button></form>
            </li>
          ))}
        </ul>
        <form action={addPair} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] items-end">
          {["noteA", "noteB"].map((k) => (
            <div key={k}>
              <label htmlFor={`a-${k}`} className="field-label">{k === "noteA" ? "Нота 1" : "Нота 2"}</label>
              <select id={`a-${k}`} name={k} className="field" required>
                {notes.map((n) => <option key={n.slug} value={n.slug}>{n.nameRu}</option>)}
              </select>
            </div>
          ))}
          <Input label="Причина (видна клиенту)" name="reason" />
          <Submit>Добавить</Submit>
        </form>
      </section>
    </>
  );
}
