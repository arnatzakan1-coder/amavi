import Link from "next/link";
import { ArrowRight, Check, Clock, Lock, MapPin, Monitor, Store } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getVolumes, getSetting } from "@/lib/data";
import { formatKzt } from "@/lib/pricing";
import { pick } from "@/i18n";
import { Reveal } from "@/components/ui/Reveal";
import { HeroBottle } from "@/components/home/HeroBottle";
import { CONFIDENTIAL_NOTICE } from "@/lib/confidential";

/** Numbered circle used for headings and steps, as in the AMAVI presentation. */
function Num({ n, light = false }: { n: number; light?: boolean }) {
  return (
    <span
      className={`inline-grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 font-display text-2xl ${
        light ? "border-ink-2 text-ink-2" : "border-cream text-cream"
      }`}
      aria-hidden
    >
      {n}
    </span>
  );
}

export default async function Home() {
  const { t, locale } = await getI18n();
  const [volumes, boutique, booking] = await Promise.all([getVolumes(), getSetting("boutique"), getSetting("booking")]);
  const minPrice = volumes.length ? Math.min(...volumes.map((v) => v.priceKzt)) : 0;
  const hours = boutique.hours ? `${boutique.hours}, ${t.boutique.daily}` : null;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden -mt-[68px] pt-[68px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-10 h-[620px] w-[620px] rounded-full bg-ink-2/70 blur-[2px]"
        />
        <div className="container-lux relative grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center min-h-[calc(100svh-68px)] py-10 lg:py-0">
          <div className="order-2 lg:order-1 animate-fade-up min-w-0">
            <p className="eyebrow">{t.home.eyebrow}</p>
            <h1 className="mt-5 text-[2.6rem] sm:text-6xl lg:text-[4.4rem] text-cream">{t.home.title}</h1>
            <p className="mt-6 text-muted text-base sm:text-lg max-w-xl">{t.home.lead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/book" className="btn btn-gold">
                {t.home.ctaBook} <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/formulas" className="btn btn-ghost">
                {t.home.ctaReorder}
              </Link>
            </div>
            <p className="mt-7 text-sm text-muted">
              10 / 30 ml · {t.home.from} <span className="font-semibold text-cream">{formatKzt(minPrice, locale)}</span> · {t.home.consultationIncluded}
            </p>
          </div>
          <div className="order-1 lg:order-2 relative h-[44svh] min-h-[300px] lg:h-[76svh]">
            <HeroBottle />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-cream border-y border-line">
        <div className="container-lux py-20 sm:py-24">
          <Reveal>
            <p className="eyebrow">AMAVI</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.stepsTitle}</h2>
          </Reveal>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {t.home.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <li className="h-full list-none rounded-2xl border border-line bg-ink/40 p-6">
                  <Num n={i + 1} />
                  <h3 className="mt-5 text-xl">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Link href="/book" className="btn btn-gold mt-10">
            {t.home.ctaBook} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* STUDIO FIRST */}
      <section className="container-lux py-20 sm:py-28 grid lg:grid-cols-[1fr_1.3fr] gap-10 items-start">
        <Reveal>
          <h2 className="text-4xl sm:text-5xl">{t.home.modelTitle}</h2>
          <p className="mt-5 text-muted max-w-lg">{t.home.modelText}</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Store, title: t.home.modelStudioTitle, items: t.home.modelStudio, strong: true },
            { icon: Monitor, title: t.home.modelOnlineTitle, items: t.home.modelOnline, strong: false },
          ].map(({ icon: Icon, title, items, strong }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className={`h-full rounded-2xl p-7 ${strong ? "bg-cream text-ink-2" : "card"}`}>
                <Icon size={26} strokeWidth={1.4} aria-hidden />
                <h3 className="mt-5 text-2xl">{title}</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {items.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRICES */}
      <section className="section-indigo">
        <div className="container-lux py-20 sm:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-end">
          <Reveal>
            <p className="eyebrow">Eau de Parfum</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.pricesTitle}</h2>
            <p className="mt-4 text-soft max-w-md">{t.home.pricesNote}</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {volumes.map((v) => (
              <div key={v.ml} className="rounded-2xl bg-ink-2 p-7 text-cream">
                <p className="font-display text-6xl">
                  {v.ml}
                  <span className="text-2xl text-muted"> ml</span>
                </p>
                <p className="mt-4 text-2xl font-semibold tabular">{formatKzt(v.priceKzt, locale)}</p>
                <p className="mt-1 text-xs text-muted">
                  {t.home.consultationIncluded} · {booking.depositPct}%: {formatKzt(Math.round((v.priceKzt * booking.depositPct) / 100), locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIDENTIALITY */}
      <section className="container-lux py-20 sm:py-24">
        <Reveal className="card p-8 sm:p-12 grid md:grid-cols-[auto_1fr] gap-6 items-start">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-cream text-ink-2" aria-hidden>
            <Lock size={24} strokeWidth={1.6} />
          </span>
          <div>
            <h2 className="text-3xl sm:text-4xl">{t.home.privacyTitle}</h2>
            <p className="mt-4 text-muted max-w-3xl">{t.home.privacyText}</p>
            <p className="mt-4 text-sm font-medium text-cream">{CONFIDENTIAL_NOTICE}</p>
          </div>
        </Reveal>
      </section>

      {/* VISIT */}
      <section className="section-cream border-t border-line">
        <div className="container-lux py-20 sm:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <p className="eyebrow">{t.boutique.title}</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.visitTitle}</h2>
            <p className="mt-6 flex gap-3 text-lg">
              <MapPin size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
              {pick(boutique, "address", locale)}
            </p>
            {hours && (
              <p className="mt-3 flex gap-3 text-lg">
                <Clock size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
                {hours}
              </p>
            )}
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/book" className="btn btn-gold">{t.home.ctaBook}</Link>
            <Link href="/boutique" className="btn btn-ghost">{t.home.ctaBoutique}</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
