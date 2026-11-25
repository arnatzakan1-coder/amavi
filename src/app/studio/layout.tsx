import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Студия", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Staff area for perfumers and administrators. Client formulas are visible only here.
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff("/studio");
  const nav: [string, string][] = [
    ["/studio/bookings", "Записи и анкеты"],
    ["/studio/formulas", "Формулы клиентов"],
    ["/create", "Конструктор формул"],
    ["/match", "Сравнение с нишей"],
  ];
  if (me.role === "ADMIN") nav.push(["/admin/perfumers", "Парфюмеры и график"], ["/admin", "Админ-панель"]);
  return (
    <div className="container-lux py-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-[84px] self-start min-w-0">
        <p className="eyebrow">AMAVI · Студия</p>
        <p className="mt-2 text-xs text-muted truncate">{me.email} · {me.role === "ADMIN" ? "администратор" : "парфюмер"}</p>
        <nav aria-label="Студия" className="mt-5 flex lg:flex-col gap-1 overflow-x-auto pb-2">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-cream/85 hover:bg-ink-2 hover:text-cream">
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 hidden lg:flex gap-2 text-xs text-muted"><Lock size={13} className="mt-0.5 shrink-0" aria-hidden /> Confidential – Accessible only to authorized AMAVI perfumers and company personnel.</p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
