import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSetting, getNotes, getDeliveryMethods } from "@/lib/data";
import { providerStatus } from "@/lib/payments";
import { enabledOAuth } from "@/auth";
import { H1 } from "@/components/admin/ui";

export default async function AdminHome() {
  const [notes, rules, boutique, delivery, [orders], [newInquiries], [collection], niche, [awaiting]] = await Promise.all([
    getNotes(),
    getSetting("rules"),
    getSetting("boutique"),
    getDeliveryMethods(true),
    db.select({ n: count() }).from(s.orders),
    db.select({ n: count() }).from(s.inquiries).where(eq(s.inquiries.status, "NEW")),
    db.select({ n: count() }).from(s.collection),
    db.select().from(s.nicheFragrances),
    db.select({ n: count() }).from(s.orders).where(eq(s.orders.status, "AWAITING_CONFIRMATION")),
  ]);

  const tierDraft = notes.filter((n) => !n.tierVerified).length;
  const noDesc = notes.filter((n) => !n.descRu).length;
  const noIntensity = notes.filter((n) => !n.intensity).length;
  const notVerified = notes.filter((n) => !n.perfumerVerified).length;

  // Everything the source files did not contain, so the team can see what to fill in.
  const todo: { text: string; href: string; done: boolean }[] = [
    { text: `Положение в пирамиде подтверждено парфюмером (черновых: ${tierDraft} из 30)`, href: "/admin/notes", done: tierDraft === 0 },
    { text: `Описания нот (без описания: ${noDesc})`, href: "/admin/notes", done: noDesc === 0 },
    { text: `Интенсивность нот (не задана: ${noIntensity})`, href: "/admin/notes", done: noIntensity === 0 },
    { text: `Ноты проверены парфюмером: допустимые доли, фиксированные ноты (не проверено: ${notVerified})`, href: "/admin/notes", done: notVerified === 0 },
    { text: "Правила формул и несовместимые сочетания подтверждены парфюмером", href: "/admin/rules", done: rules.verified },
    { text: "Стоимость доставки по Казахстану (Астана и др.)", href: "/admin/pricing", done: delivery.every((d) => d.priceKzt != null) },
    { text: "Режим работы бутика", href: "/admin/boutique", done: Boolean(boutique.hours) },
    { text: "Координаты и карточка 2GIS бутика", href: "/admin/boutique", done: boutique.lat != null && boutique.lon != null },
    { text: "Договор аренды подписан (снимет пометку «готовится к открытию»)", href: "/admin/boutique", done: boutique.leaseSigned },
    { text: "Ароматы коллекции AMAVI (20 рецептов парфюмера)", href: "/admin/collection", done: collection.n > 0 },
    { text: `Списки нот нишевых ароматов сверены с сайтами брендов (не сверено: ${niche.filter((n) => !n.verified).length})`, href: "/admin/niche", done: niche.every((n) => n.verified) },
  ];

  return (
    <>
      <H1 sub="Данные из файлов AMAVI загружены. Ниже — то, чего в файлах не было и что нужно заполнить.">Обзор</H1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/orders" className="card p-5 hover:border-muted-dark"><p className="text-xs text-muted">Заказов всего</p><p className="font-display text-4xl">{orders.n}</p></Link>
        <Link href="/admin/orders?status=AWAITING_CONFIRMATION" className="card p-5 hover:border-muted-dark"><p className="text-xs text-muted">Ждут подтверждения</p><p className="font-display text-4xl text-champagne">{awaiting.n}</p></Link>
        <Link href="/admin/inquiries" className="card p-5 hover:border-muted-dark"><p className="text-xs text-muted">Новые заявки</p><p className="font-display text-4xl">{newInquiries.n}</p></Link>
      </div>

      <section className="mt-8 card p-6">
        <h2 className="text-2xl">Требует заполнения</h2>
        <ul className="mt-4 divide-y divide-line">
          {todo.map((t) => (
            <li key={t.text} className="py-3 flex items-center justify-between gap-4 text-sm">
              <span className={t.done ? "text-muted line-through" : ""}>{t.done ? "✓ " : "⚑ "}{t.text}</span>
              {!t.done && <Link href={t.href} className="text-champagne underline underline-offset-4 shrink-0">Открыть</Link>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 card p-6">
        <h2 className="text-2xl">Подключения</h2>
        <p className="mt-1 text-xs text-muted">Ключи задаются переменными окружения на сервере (см. README). Значения ключей здесь не показываются.</p>
        <div className="mt-4 overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm min-w-[520px]">
          <tbody className="divide-y divide-line">
            {providerStatus().map((p) => (
              <tr key={p.code}>
                <td className="py-2.5 pr-4">Онлайн-оплата: {p.code}</td>
                <td className="py-2.5 pr-4 text-xs text-muted break-all">{p.env.join(", ")}</td>
                <td className="py-2.5 whitespace-nowrap">{p.ready ? <span className="text-ok">работает</span> : p.keysPresent ? <span className="text-champagne">ключи есть, нужна интеграция</span> : <span className="text-muted">не подключено</span>}</td>
              </tr>
            ))}
            <tr><td className="py-2.5 pr-4">Вход через Google</td><td className="py-2.5 pr-4 text-xs text-muted">AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET</td><td>{enabledOAuth.google ? <span className="text-ok">включён</span> : <span className="text-muted">не подключено</span>}</td></tr>
            <tr><td className="py-2.5 pr-4">Вход через Apple</td><td className="py-2.5 pr-4 text-xs text-muted">AUTH_APPLE_ID, AUTH_APPLE_SECRET</td><td>{enabledOAuth.apple ? <span className="text-ok">включён</span> : <span className="text-muted">не подключено</span>}</td></tr>
            <tr><td className="py-2.5 pr-4">Карта 2GIS</td><td className="py-2.5 pr-4 text-xs text-muted">NEXT_PUBLIC_2GIS_API_KEY</td><td>{process.env.NEXT_PUBLIC_2GIS_API_KEY ? <span className="text-ok">ключ задан</span> : <span className="text-muted">не подключено</span>}</td></tr>
          </tbody>
        </table>
        </div>
      </section>
    </>
  );
}
