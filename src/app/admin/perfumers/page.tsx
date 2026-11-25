import { asc, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { savePerfumer } from "../actions";
import { Check, H1, Input, Needs, Saved, Submit, Textarea } from "@/components/admin/ui";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default async function AdminPerfumers({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const list = await db.select().from(s.perfumers).orderBy(asc(s.perfumers.sortOrder));
  const ids = list.map((p) => p.userId).filter(Boolean) as string[];
  const users = ids.length ? await db.select({ id: s.users.id, email: s.users.email }).from(s.users).where(inArray(s.users.id, ids)) : [];
  const emailOf = new Map(users.map((u) => [u.id, u.email]));
  const blank = { id: "", name: "", bioRu: null, bioKk: null, bioEn: null, userId: null, workDays: "1,2,3,4,5,6,7", startTime: "10:00", endTime: "21:00", daysOff: "", sortOrder: list.length, active: true, nameVerified: false };

  return (
    <>
      <H1 sub="Эти парфюмеры и их график показываются клиентам на странице записи. Привяжите аккаунт сотрудника по email — ему откроется раздел «Студия» (записи, анкеты, формулы).">
        Парфюмеры и график
      </H1>
      <Saved show={sp.saved === "1"} />
      {sp.error === "email" && <p className="mb-5 text-danger">Аккаунт с таким email не найден — сотрудник должен сначала зарегистрироваться на сайте.</p>}
      <div className="grid gap-5">
        {[...list, blank].map((p) => (
          <form key={p.id || "new"} action={savePerfumer} className="card p-6 grid gap-4">
            <input type="hidden" name="id" value={p.id} />
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl">{p.id ? p.name : "Добавить парфюмера"}</h2>
              {p.id && !p.nameVerified && <Needs>Имя-заглушка — укажите настоящее</Needs>}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Имя (видят клиенты)" name="name" defaultValue={p.name} required={!p.id ? false : true} />
              <Input label="Email аккаунта сотрудника" name="email" type="email" defaultValue={p.userId ? emailOf.get(p.userId) : ""} hint="Необязательно" />
              <Input label="Порядок" name="sortOrder" type="number" defaultValue={p.sortOrder} />
            </div>
            <fieldset>
              <legend className="field-label">Рабочие дни</legend>
              <div className="flex flex-wrap gap-x-4">
                {WD.map((w, i) => (
                  <Check key={w} label={w} name={`d${i + 1}`} defaultChecked={p.workDays.split(",").includes(String(i + 1))} />
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Начало смены" name="startTime" type="time" defaultValue={p.startTime} />
              <Input label="Конец смены" name="endTime" type="time" defaultValue={p.endTime} />
              <Input label="Выходные даты" name="daysOff" defaultValue={p.daysOff.replaceAll(",", ", ")} hint="Формат: 2026-12-31, 2027-01-01" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Textarea label="О парфюмере (RU)" name="bioRu" defaultValue={p.bioRu} rows={2} />
              <Textarea label="О парфюмере (KK)" name="bioKk" defaultValue={p.bioKk} rows={2} />
              <Textarea label="About (EN)" name="bioEn" defaultValue={p.bioEn} rows={2} />
            </div>
            <div className="flex flex-wrap gap-x-6">
              <Check label="Принимает записи" name="active" defaultChecked={p.active} />
              <Check label="Имя подтверждено" name="nameVerified" defaultChecked={p.nameVerified} />
            </div>
            <div><Submit>{p.id ? "Сохранить" : "Добавить"}</Submit></div>
          </form>
        ))}
      </div>
    </>
  );
}
