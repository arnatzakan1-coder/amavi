import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getEvents } from "@/lib/data";
import { deleteCollection, saveCollection } from "../actions";
import { H1, Saved, Input, Textarea, Check, Submit } from "@/components/admin/ui";

type C = typeof s.collection.$inferSelect;

function CollectionForm({ c, events }: { c?: C; events: { slug: string; nameRu: string }[] }) {
  const items = c ? (JSON.parse(c.itemsJson) as { slug: string; parts: number; tier: string }[]).map((i) => `${i.slug} ${i.parts} ${i.tier}`).join("\n") : "";
  return (
    <form action={saveCollection} className="grid gap-4 md:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Input label="Название" name="name" defaultValue={c?.name} required />
      <Input label="Концентрация, %" name="concentrationPct" type="number" defaultValue={c?.concentrationPct ?? 20} />
      <div>
        <label htmlFor="ev" className="field-label">Событие</label>
        <select id="ev" name="eventSlug" defaultValue={c?.eventSlug ?? ""} className="field">
          <option value="">—</option>
          {events.map((e) => <option key={e.slug} value={e.slug}>{e.nameRu}</option>)}
        </select>
      </div>
      <Textarea className="md:col-span-3" label="Формула: по строке на ноту — slug частей уровень" name="items" rows={6} defaultValue={items} hint="Например: bergamot 3 TOP · rose 4 HEART · sandalwood 5 BASE" />
      <Textarea label="Описание (рус)" name="descRu" defaultValue={c?.descRu} />
      <Textarea label="Описание (қаз)" name="descKk" defaultValue={c?.descKk} />
      <Textarea label="Описание (eng)" name="descEn" defaultValue={c?.descEn} />
      <Input label="Порядок" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
      <div className="md:col-span-2 flex items-end gap-6">
        <Check label="Опубликован" name="active" defaultChecked={c?.active ?? true} />
        <Submit>{c ? "Сохранить" : "Добавить"}</Submit>
      </div>
    </form>
  );
}

export default async function AdminCollection({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const [rows, events] = await Promise.all([db.select().from(s.collection).orderBy(asc(s.collection.sortOrder)), getEvents(false)]);
  return (
    <>
      <H1 sub="Готовые ароматы бренда (рекомендованные рецепты парфюмера, CAPEX 3.8). Клиенты могут взять любой за основу в конструкторе.">Коллекция AMAVI</H1>
      <Saved show={sp.saved === "1"} />
      {sp.error && <p role="alert" className="mb-5 field-error">Укажите название и хотя бы одну строку формулы в формате «slug частей уровень».</p>}
      <div className="grid gap-4">
        {rows.map((c) => (
          <details key={c.id} className="card p-5">
            <summary className="cursor-pointer font-display text-xl">{c.name} {!c.active && <span className="chip ml-2">скрыт</span>}</summary>
            <div className="mt-5"><CollectionForm c={c} events={events} /></div>
            <form action={deleteCollection} className="mt-3"><input type="hidden" name="id" value={c.id} /><button className="text-sm text-danger underline underline-offset-4">Удалить</button></form>
          </details>
        ))}
        <section className="card p-5">
          <h2 className="text-2xl mb-4">Новый аромат</h2>
          <CollectionForm events={events} />
        </section>
      </div>
    </>
  );
}
