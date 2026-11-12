import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { FAMILIES, TIERS } from "@/lib/families";
import { updateNote } from "../../actions";
import { H1, Input, Textarea, Check, Submit } from "@/components/admin/ui";
import ru from "@/i18n/ru";

export default async function EditNote({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [n] = await db.select().from(s.notes).where(eq(s.notes.slug, slug));
  if (!n) notFound();
  return (
    <>
      <Link href="/admin/notes" className="text-sm text-muted hover:text-cream">← Все ноты</Link>
      <div className="mt-3"><H1 sub={`${n.material} · поставщик: ${n.supplier ?? "—"}`}>{n.nameRu}</H1></div>

      <div className="card p-5 mb-6 text-sm space-y-2">
        <p><span className="text-muted">Безопасность (из финмодели): </span>{n.safetyNote}</p>
        <p><span className="text-muted">Документы у поставщика: </span>{n.documents}</p>
      </div>

      <form action={updateNote} className="card p-6 grid gap-5 md:grid-cols-3">
        <input type="hidden" name="id" value={n.id} />
        <Input label="Название (рус)" name="nameRu" defaultValue={n.nameRu} required />
        <Input label="Название (қаз)" name="nameKk" defaultValue={n.nameKk} required />
        <Input label="Название (eng)" name="nameEn" defaultValue={n.nameEn} required />

        <div>
          <label htmlFor="a-family" className="field-label">Семейство</label>
          <select id="a-family" name="family" defaultValue={n.family} className="field">
            {FAMILIES.map((f) => <option key={f} value={f}>{ru.families[f]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="a-tier" className="field-label">Уровень пирамиды</label>
          <select id="a-tier" name="tier" defaultValue={n.tier ?? ""} className="field">
            <option value="">Любой</option>
            {TIERS.map((t) => <option key={t} value={t}>{ru.tiers[t]}</option>)}
          </select>
        </div>
        <div className="flex items-end"><Check label="Уровень подтверждён парфюмером" name="tierVerified" defaultChecked={n.tierVerified} /></div>

        <Input label="Интенсивность (1–5)" name="intensity" type="number" defaultValue={n.intensity} hint="Пусто — «уточняется»" />
        <Input label="Мин. доля (частей)" name="minParts" type="number" defaultValue={n.minParts} required />
        <Input label="Макс. доля (частей)" name="maxParts" type="number" defaultValue={n.maxParts} required />
        <Input label="Макс. % в композиции" name="maxSharePct" type="number" step="0.1" defaultValue={n.maxSharePct} hint="Ограничение парфюмера / IFRA. Пусто — без ограничения" />
        <Input label="Доля фиксированной ноты" name="fixedParts" type="number" defaultValue={n.fixedParts} />
        <div className="flex flex-col justify-end">
          <Check label="Фиксированная нота (клиент не может менять)" name="isFixed" defaultChecked={n.isFixed} />
        </div>

        <Textarea className="md:col-span-3" label="Описание (рус)" name="descRu" defaultValue={n.descRu} />
        <Textarea className="md:col-span-3" label="Описание (қаз)" name="descKk" defaultValue={n.descKk} />
        <Textarea className="md:col-span-3" label="Описание (eng)" name="descEn" defaultValue={n.descEn} />

        <div className="md:col-span-3 flex flex-wrap gap-6 items-center">
          <Check label="Нота доступна клиентам" name="active" defaultChecked={n.active} />
          <Check label="Данные проверены парфюмером" name="perfumerVerified" defaultChecked={n.perfumerVerified} />
          <Submit />
        </div>
      </form>
    </>
  );
}
