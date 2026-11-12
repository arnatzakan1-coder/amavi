import { getEvents } from "@/lib/data";
import { FAMILIES } from "@/lib/families";
import { saveEvent } from "../actions";
import { H1, Saved, Input, Check, Submit } from "@/components/admin/ui";
import ru from "@/i18n/ru";
import type { EventCategory } from "@/db/schema";

function EventForm({ e }: { e?: EventCategory }) {
  const fams = new Set((e?.recommendedFamilies ?? "").split(","));
  return (
    <form action={saveEvent} className="card p-5 grid gap-4 md:grid-cols-4 items-end">
      {e && <input type="hidden" name="id" value={e.id} />}
      <Input label="Название (рус)" name="nameRu" defaultValue={e?.nameRu} required />
      <Input label="Название (қаз)" name="nameKk" defaultValue={e?.nameKk} required />
      <Input label="Название (eng)" name="nameEn" defaultValue={e?.nameEn} required />
      <Input label="Порядок" name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 99} />
      <fieldset className="md:col-span-4">
        <legend className="field-label">Рекомендуемые семейства</legend>
        <div className="flex flex-wrap gap-x-5">
          {FAMILIES.map((f) => <Check key={f} label={ru.families[f]} name={`fam_${f}`} defaultChecked={fams.has(f)} />)}
        </div>
      </fieldset>
      <div className="md:col-span-4 flex items-center gap-6">
        <Check label="Активно" name="active" defaultChecked={e?.active ?? true} />
        <Submit>{e ? "Сохранить" : "Добавить событие"}</Submit>
      </div>
    </form>
  );
}

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const events = await getEvents(false);
  return (
    <>
      <H1 sub="Список из брифа. Рекомендованные семейства — черновик (дневные — свежие, вечерние — глубокие, по документу AMAVI); при выборе события клиент видит подсказки, но может использовать любые ноты.">События</H1>
      <Saved show={sp.saved === "1"} />
      <div className="grid gap-4">
        {events.map((e) => <EventForm key={e.id} e={e} />)}
        <h2 className="text-2xl mt-6">Новое событие</h2>
        <EventForm />
      </div>
    </>
  );
}
