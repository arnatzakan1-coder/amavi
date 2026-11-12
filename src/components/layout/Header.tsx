"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Menu, X, ShoppingBag, User } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/i18n";
import { setLocale } from "@/app/actions/locale";
import { useCart, useHydrated } from "@/lib/stores";
import { Wordmark } from "./Wordmark";
import { signOutAction } from "@/app/actions/auth";

type Props = { user: { name: string; role: "USER" | "ADMIN" } | null };

export function Header({ user }: Props) {
  const { t, locale } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pending, start] = useTransition();
  const hydrated = useHydrated();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/create", label: t.nav.create, compactOnly: true },
    { href: "/collection", label: t.nav.collection },
    { href: "/match", label: t.nav.match },
    { href: "/about", label: t.nav.about },
    { href: "/boutique", label: t.nav.boutique },
  ];
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  const LangSwitch = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t.common.language}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => start(() => setLocale(l))}
          aria-pressed={l === locale}
          lang={l}
          className={`min-h-[40px] min-w-[44px] px-2 text-[0.72rem] tracking-[0.14em] uppercase rounded-full transition-colors ${
            l === locale ? "text-ink bg-champagne" : "text-muted hover:text-cream"
          }`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );

  return (
    <>
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 border-b ${
        scrolled || open ? "bg-ink/90 backdrop-blur-md border-line" : "bg-transparent border-transparent"
      }`}
    >
      <div className="container-lux flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label={`AMAVI — ${t.nav.home}`}>
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden xl:flex items-center gap-7">
          {links.filter((l) => !("compactOnly" in l)).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`whitespace-nowrap text-[0.7rem] tracking-[0.16em] uppercase transition-colors ${
                isActive(l.href) ? "text-champagne" : "text-cream/75 hover:text-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LangSwitch className="hidden md:flex" />
          <Link
            href={user ? "/account" : "/login"}
            className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full text-cream/80 hover:text-cream hover:bg-ink-3"
            aria-label={user ? t.nav.account : t.nav.login}
          >
            <User size={19} strokeWidth={1.5} aria-hidden />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-cream/80 hover:text-cream hover:bg-ink-3"
            aria-label={`${t.nav.cart}${hydrated && count ? ` (${count})` : ""}`}
          >
            <ShoppingBag size={19} strokeWidth={1.5} aria-hidden />
            {hydrated && count > 0 && (
              <span className="absolute top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-champagne text-ink text-[10px] font-semibold grid place-items-center">
                {count}
              </span>
            )}
          </Link>
          <Link href="/create" className="hidden xl:inline-flex btn btn-gold btn-sm ml-2">
            {t.nav.create}
          </Link>
          <button
            type="button"
            className="xl:hidden inline-flex h-11 w-11 items-center justify-center rounded-full text-cream hover:bg-ink-3"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.common.close : t.common.menu}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

    </header>
      {open && (
        <div id="mobile-nav" className="xl:hidden fixed inset-x-0 top-[68px] bottom-0 bg-ink z-[45] overflow-y-auto animate-fade-up">
          <nav aria-label="Mobile" className="container-lux py-8 flex flex-col">
            {[{ href: "/", label: t.nav.home }, ...links, { href: "/formulas", label: t.nav.formulas }, { href: user ? "/account" : "/login", label: user ? t.nav.account : t.nav.login }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className="font-display text-3xl py-3 border-b border-line text-cream hover:text-champagne"
              >
                {l.label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="font-display text-2xl py-3 border-b border-line text-gold">
                {t.nav.admin}
              </Link>
            )}
            <LangSwitch className="mt-8" />
            {user && (
              <form action={signOutAction} className="mt-6">
                <button className="btn btn-ghost btn-sm">{t.nav.logout}</button>
              </form>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
