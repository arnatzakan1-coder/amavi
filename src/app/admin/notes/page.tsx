import Link from "next/link";
import { getNotes } from "@/lib/data";
import { importNotesCsv } from "../actions";
import { H1, Saved, Needs } from "@/components/admin/ui";
import ru from "@/i18n/ru";

export default async function AdminNotes({ searchParams }: { searchParams: Promise<{ saved?: string; import?: string }> }) {
  const sp = await searchParams;
  const notes = await getNotes();
  return (
    <>
      <H1 sub="Название, семейство, сырьё, поставщик и примечания по безопасности взяты из финансовой модели (лист T2_Notes). Уровень пирамиды, интенсивность, описания и ограничения задаёт парфюмер.">Ноты</H1>
      <Saved show={sp.saved === "1"} />
      {sp.import && <Saved show text={sp.import === "bad" ? "Файл не распознан" : `Импорт: обновлено нот — ${sp.import}`} />}

      <div className="card p-5 mb-6 grid gap-4 md:grid-cols-[1fr_auto] items-end">
        <form action={importNotesCsv} className="grid gap-2">
          <label htmlFor="csv" className="field-label">Загрузить CSV с данными нот (обновление по колонке slug)</label>
          <div className="flex flex-wrap gap-2">
            <input id="csv" name="file" type="file" accept=".csv,text/csv" required className="field max-w-sm py-2" />
            <button className="btn btn-gold btn-sm">Импортировать</button>
          </div>
          <p className="text-xs text-muted">Колонки: slug, name_ru, name_kk, name_en, family, tier, tier_verified, intensity, is_fixed, fixed_parts, min_parts, max_parts, max_share_pct, desc_ru, desc_kk, desc_en, active</p>
        </form>
        <a href="/admin/notes/export" className="btn btn-ghost btn-sm">Скачать CSV</a>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="p-3">#</th><th className="p-3">Нота</th><th className="p-3">Семейство</th><th className="p-3">Уровень</th><th className="p-3">Доли</th><th className="p-3">Статус</th><th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {notes.map((n) => (
              <tr key={n.id} className={n.active ? "" : "opacity-50"}>
                <td className="p-3 text-muted">{n.position}</td>
                <td className="p-3"><span className="block">{n.nameRu}</span><span className="text-xs text-muted">{n.slug}</span></td>
                <td className="p-3">{ru.families[n.family as keyof typeof ru.families] ?? n.family}</td>
                <td className="p-3">{n.tier ? ru.tiers[n.tier as "TOP"] : "—"} {!n.tierVerified && <span className="text-xs text-champagne">(черновик)</span>}</td>
                <td className="p-3 tabular-nums">{n.isFixed ? `фикс. ${n.fixedParts ?? n.minParts}` : `${n.minParts}–${n.maxParts}`}{n.maxSharePct ? ` · ≤${n.maxSharePct}%` : ""}</td>
                <td className="p-3 flex flex-wrap gap-1">
                  {!n.descRu && <Needs>описание</Needs>}
                  {!n.intensity && <Needs>интенсивность</Needs>}
                  {n.perfumerVerified ? <span className="chip text-ok border-ok/40">проверено</span> : <Needs>парфюмер</Needs>}
                </td>
                <td className="p-3 text-right"><Link href={`/admin/notes/${n.slug}`} className="text-champagne underline underline-offset-4">Изменить</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
