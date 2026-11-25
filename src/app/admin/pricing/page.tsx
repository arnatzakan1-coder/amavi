import { db, schema as s } from "@/db";
import { asc } from "drizzle-orm";
import { getSetting } from "@/lib/data";
import { paymentAvailable } from "@/lib/payments";
import { updatePricing } from "../actions";
import { H1, Saved, Check, Submit, Needs } from "@/components/admin/ui";

export default async function AdminPricing({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const [volumes, concs, gift, delivery, payments] = await Promise.all([
    db.select().from(s.volumes).orderBy(asc(s.volumes.ml)),
    db.select().from(s.concentrations).orderBy(asc(s.concentrations.pct)),
    getSetting("giftSet"),
    db.select().from(s.deliveryMethods).orderBy(asc(s.deliveryMethods.sortOrder)),
    db.select().from(s.paymentMethods).orderBy(asc(s.paymentMethods.sortOrder)),
  ]);
  return (
    <>
      <H1 sub="Цены из презентации AMAVI: 10 мл — 24 000 ₸, 30 мл — 45 000 ₸ (консультация включена). Концентрат — 20 %. Готовые флаконы выдаются только в студии; доставка отключена. Итоговая цена всегда считается на сервере.">Цены и получение</H1>
      <Saved show={sp.saved === "1"} />
      <form action={updatePricing} className="space-y-6">
        <section className="card p-6">
          <h2 className="text-2xl">Объёмы флаконов</h2>
          <div className="mt-4 grid gap-3">
            {volumes.map((v) => (
              <div key={v.id} className="grid grid-cols-[80px_1fr_auto] gap-3 items-center">
                <span className="font-display text-2xl">{v.ml} ml</span>
                <label className="sr-only" htmlFor={`vol_${v.id}`}>Цена {v.ml} мл</label>
                <input id={`vol_${v.id}`} name={`vol_${v.id}`} type="number" min={0} defaultValue={v.priceKzt} className="field" />
                <Check label="Доступен" name={`vol_active_${v.id}`} defaultChecked={v.active} />
              </div>
            ))}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center border-t border-line pt-3">
              <span className="text-xs text-muted">Новый</span>
              <input name="new_ml" type="number" placeholder="мл" className="field" aria-label="Новый объём, мл" />
              <input name="new_price" type="number" placeholder="цена, ₸" className="field" aria-label="Цена нового объёма" />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl">Концентрации</h2>
          <p className="text-xs text-muted mt-1">Финмодель допускает 15, 20 и 25 % (стандарт 20 %). Доплата к цене флакона — по решению команды.</p>
          <div className="mt-4 grid gap-3">
            {concs.map((c) => (
              <div key={c.id} className="grid grid-cols-[80px_1fr_auto_auto] gap-3 items-center">
                <span className="font-display text-2xl">{c.pct}%</span>
                <input name={`conc_${c.id}`} type="number" min={0} defaultValue={c.surchargeKzt} className="field" aria-label={`Доплата за ${c.pct}%`} />
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="conc_default" value={c.id} defaultChecked={c.isDefault} className="accent-[#2c0a71]" /> по умолчанию</label>
                <Check label="Доступна" name={`conc_active_${c.id}`} defaultChecked={c.active} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 grid gap-4 sm:grid-cols-4 items-end">
          <h2 className="text-2xl sm:col-span-4">Подарочный набор</h2>
          <Check label="Включён" name="gift_enabled" defaultChecked={gift.enabled} />
          <div><label className="field-label" htmlFor="gb">Флаконов</label><input id="gb" name="gift_bottles" type="number" defaultValue={gift.bottles} className="field" /></div>
          <div><label className="field-label" htmlFor="gv">Объём, мл</label><input id="gv" name="gift_volume" type="number" defaultValue={gift.volumeMl} className="field" /></div>
          <div><label className="field-label" htmlFor="gp">Цена набора, ₸</label><input id="gp" name="gift_price" type="number" defaultValue={gift.priceKzt} className="field" /></div>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl">Доставка</h2>
          <p className="text-xs text-muted mt-1">Пустая цена — способ скрыт на сайте.</p>
          <div className="mt-4 grid gap-3">
            {delivery.map((d) => (
              <div key={d.id} className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-center">
                <span>{d.nameRu} {d.priceKzt == null && <Needs>цена не задана</Needs>}</span>
                <input name={`del_${d.id}`} type="number" min={0} defaultValue={d.priceKzt ?? ""} className="field" aria-label={`Цена: ${d.nameRu}`} />
                <Check label="Активна" name={`del_active_${d.id}`} defaultChecked={d.active} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl">Способы оплаты</h2>
          <div className="mt-4 grid gap-2">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <Check label={p.nameRu} name={`pay_active_${p.id}`} defaultChecked={p.active} />
                <span className="text-xs text-muted">
                  {paymentAvailable(p.code, true) ? "готов к работе" : "онлайн-интеграция не подключена — на сайте показывается как «подключается»"}
                </span>
              </div>
            ))}
          </div>
        </section>
        <Submit />
      </form>
    </>
  );
}
