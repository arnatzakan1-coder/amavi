import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Админ-панель", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "Обзор"],
  ["/admin/orders", "Заказы"],
  ["/admin/inquiries", "Заявки"],
  ["/admin/notes", "Ноты (30)"],
  ["/admin/rules", "Правила формул"],
  ["/admin/pricing", "Цены и доставка"],
  ["/admin/events", "События"],
  ["/admin/collection", "Коллекция AMAVI"],
  ["/admin/niche", "Нишевые ароматы"],
  ["/admin/boutique", "Бутик и 2GIS"],
  ["/admin/users", "Пользователи"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="container-lux py-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-[84px] self-start min-w-0">
        <p className="eyebrow">AMAVI · Admin</p>
        <p className="mt-2 text-xs text-muted truncate">{admin.email}</p>
        <nav aria-label="Админ" className="mt-5 flex lg:flex-col gap-1 overflow-x-auto pb-2">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-cream/80 hover:bg-ink-3 hover:text-cream">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
