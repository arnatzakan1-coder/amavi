import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getNotes } from "@/lib/data";
import { deleteNiche, saveNiche } from "../actions";
import { H1, Saved, Input, Check, Submit, Needs } from "@/components/admin/ui";
import type { NicheFragrance } from "@/db/schema";

function NicheForm({ f }: { f?: NicheFragrance }) {
  return (
    <form action={saveNiche} className="grid gap-4 md:grid-cols-2">
      {f && <input type="hidden" name="id" value={f.id} />}
      <Input label="Бренд" name="brand" defaultValue={f?.brand} required />
      <Input label="Название" name="name" defaultValue={f?.name} required />
      <Input className="md:col-span-2" label="Ноты AMAVI из опубликованного списка (slug через запятую)" name="notes" defaultValue={f?.notes.split(",").join(", ")} />
      <Input className="md:col-span-2" label="Прочие заявленные ноты (без аналога в AMAVI)" name="otherNotes" defaultValue={f?.otherNotes} />
      <Input label="Аккорды / семейства (CITRUS, FLORAL…)" name="accords" defaultValue={f?.accords.split(",").join(", ")} />
      <Input label="Источник (официальная страница)" name="sourceUrl" defaultValue={f?.sourceUrl} />
      <Input label="Изображение (https)" name="imageUrl" defaultValue={f?.imageUrl} />
      <div className="flex flex-col justify-end">
        <Check label="Есть право на использование изображения" name="imageRightsConfirmed" defaultChecked={f?.imageRightsConfirmed} />
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-6 items-center">
        <Check label="Список нот сверен с сайтом бренда" name="verified" defaultChecked={f?.verified} />
        <Check label="Показывать" name="active" defaultChecked={f?.active ?? true} />
        <Submit>{f ? "Сохранить" : "Добавить"}</Submit>
      </div>
    </form>
  );
}

export default async function AdminNiche({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const [rows, notes] = await Promise.all([db.select().from(s.nicheFragrances).orderBy(asc(s.nicheFragrances.brand)), getNotes()]);
  return (
    <>
      <H1 sub="Используются только публично заявленные ноты — не формулы. Изображения показываются, только если отмечено право на использование.">Нишевые ароматы для сравнения</H1>
      <Saved show={sp.saved === "1"} />
      <details className="card p-4 mb-5 text-xs text-muted">
        <summary className="cursor-pointer text-sm text-cream">Slug всех 30 нот</summary>
        <p className="mt-2 leading-relaxed">{notes.map((n) => `${n.slug} (${n.nameRu})`).join(" · ")}</p>
      </details>
      <div className="grid gap-4">
        {rows.map((f) => (
          <details key={f.id} className="card p-5">
            <summary className="cursor-pointer flex flex-wrap items-center gap-3">
              <span className="font-display text-xl">{f.brand} — {f.name}</span>
              {!f.verified && <Needs>сверить</Needs>}
              {!f.active && <span className="chip">скрыт</span>}
            </summary>
            <div className="mt-5"><NicheForm f={f} /></div>
            <form action={deleteNiche} className="mt-3"><input type="hidden" name="id" value={f.id} /><button className="text-sm text-danger underline underline-offset-4">Удалить</button></form>
          </details>
        ))}
        <section className="card p-5">
          <h2 className="text-2xl mb-4">Добавить аромат</h2>
          <NicheForm />
        </section>
      </div>
    </>
  );
}
