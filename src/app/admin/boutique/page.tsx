import { getSetting } from "@/lib/data";
import { updateBoutique } from "../actions";
import { H1, Saved, Input, Check, Submit } from "@/components/admin/ui";

export default async function AdminBoutique({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const b = await getSetting("boutique");
  return (
    <>
      <H1 sub="Адрес студии: ул. Желтоксан, 155 (Алмалинский район), режим работы 10:00–21:00 ежедневно. Координаты для метки на карте и ссылку на карточку 2GIS укажите вручную.">Студия и 2GIS</H1>
      <Saved show={sp.saved === "1"} />
      <form action={updateBoutique} className="card p-6 grid gap-5 md:grid-cols-2">
        <Input className="md:col-span-2" label="Адрес (рус)" name="addressRu" defaultValue={b.addressRu} required />
        <Input label="Адрес (қаз)" name="addressKk" defaultValue={b.addressKk} />
        <Input label="Адрес (eng)" name="addressEn" defaultValue={b.addressEn} />
        <Input label="Широта (lat)" name="lat" type="number" step="0.000001" defaultValue={b.lat} hint="Например, из карточки 2GIS" />
        <Input label="Долгота (lon)" name="lon" type="number" step="0.000001" defaultValue={b.lon} />
        <Input className="md:col-span-2" label="Ссылка на карточку 2GIS" name="twoGisUrl" defaultValue={b.twoGisUrl} hint="https://2gis.kz/almaty/… — используется для кнопки «Открыть в 2GIS»" />
        <Input label="Режим работы" name="hours" defaultValue={b.hours} hint="Например: ежедневно 10:00–21:00" />
        <Input label="Телефон" name="phone" defaultValue={b.phone} hint="Используется для «Позвонить» и WhatsApp" />
        <Input label="Объявление о помещении" name="listingUrl" defaultValue={b.listingUrl} />
        <div className="md:col-span-2 flex flex-wrap items-center gap-6">
          <Check label="Договор аренды подписан, бутик открыт" name="leaseSigned" defaultChecked={b.leaseSigned} />
          <Submit />
        </div>
      </form>
    </>
  );
}
