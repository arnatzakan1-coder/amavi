import Link from "next/link";
import { ArrowRight, Droplets, CalendarHeart, Store, BookmarkCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getVolumes, getSetting } from "@/lib/data";
import { formatKzt } from "@/lib/pricing";
import { pick } from "@/i18n";
import { Reveal } from "@/components/ui/Reveal";
import { HeroBottle } from "@/components/home/HeroBottle";
import { FAMILIES, FAMILY_COLORS } from "@/lib/families";

export default async function Home() {
  const { t, locale } = await getI18n();
  const [volumes, gift, boutique] = await Promise.all([getVolumes(), getSetting("giftSet"), getSetting("boutique")]);
  const minPrice = Math.min(...volumes.map((v) => v.priceKzt));
  const icons = [Droplets, CalendarHeart, Store, BookmarkCheck];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden -mt-[68px] pt-[68px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 72% 42%, rgba(196,164,107,0.18), transparent 70%), radial-gradient(40% 40% at 10% 90%, rgba(91,42,60,0.25), transparent 70%)",
          }}
        />
        <div className="container-lux relative grid lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-10 items-center min-h-[calc(100svh-68px)] py-10 lg:py-0">
          <div className="order-2 lg:order-1 animate-fade-up">
            <p className="eyebrow">{t.home.eyebrow}</p>
            <h1 className="mt-5 text-[2.7rem] sm:text-6xl lg:text-[4.6rem] text-cream">{t.home.title}</h1>
            <p className="mt-6 text-cream/75 text-base sm:text-lg max-w-xl">{t.home.lead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/create" className="btn btn-gold">
                {t.home.ctaCreate} <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/boutique" className="btn btn-ghost">
                {t.home.ctaBoutique}
              </Link>
            </div>
            <p className="mt-7 text-sm text-muted">
              10 / 30 ml · {t.home.from} <span className="text-champagne">{formatKzt(minPrice, locale)}</span>
            </p>
          </div>
          <div className="order-1 lg:order-2 relative h-[46svh] min-h-[320px] lg:h-[78svh]">
            <HeroBottle />
          </div>
        </div>
      </section>

      {/* NOTE FAMILIES STRIP */}
      <section aria-label={t.creator.palette} className="border-y border-line">
        <div className="container-lux py-6 flex flex-wrap justify-center gap-x-7 gap-y-3">
          {FAMILIES.map((f) => (
            <span key={f} className="inline-flex items-center gap-2 text-[0.72rem] tracking-[0.2em] uppercase text-cream/70">
              <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[f] }} aria-hidden />
              {t.families[f]}
            </span>
          ))}
        </div>
      </section>

      {/* PILLARS */}
      <section className="section-cream">
        <div className="container-lux py-20 sm:py-28">
          <Reveal>
            <p className="eyebrow">AMAVI</p>
            <h2 className="mt-4 text-4xl sm:text-5xl max-w-2xl">{t.home.pillarsTitle}</h2>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#d9ccb6] border border-[#d9ccb6] rounded-2xl overflow-hidden">
            {t.home.pillars.map((p, i) => {
              const Icon = icons[i];
              return (
                <Reveal key={p.title} delay={i * 0.06} className="bg-cream p-7 sm:p-8">
                  <Icon size={26} strokeWidth={1.2} className="text-gold-deep" aria-hidden />
                  <h3 className="mt-6 text-2xl">{p.title}</h3>
                  <p className="mt-3 text-sm text-soft leading-relaxed">{p.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="container-lux py-20 sm:py-28">
        <Reveal>
          <p className="eyebrow">Perfume Creator</p>
          <h2 className="mt-4 text-4xl sm:text-5xl max-w-2xl">{t.home.stepsTitle}</h2>
        </Reveal>
        <ol className="mt-14 grid md:grid-cols-3 gap-6">
          {t.home.steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <li className="card h-full p-8 list-none">
                <span className="font-display text-5xl text-gold/80">0{i + 1}</span>
                <h3 className="mt-6 text-2xl">{s.title}</h3>
                <p className="mt-3 text-cream/70 text-sm leading-relaxed">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10">
          <Link href="/create" className="btn btn-gold">
            {t.home.ctaCreate} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* PRICES */}
      <section className="border-y border-line bg-ink-2">
        <div className="container-lux py-20 sm:py-24 grid lg:grid-cols-[1fr_1.4fr] gap-10 items-end">
          <Reveal>
            <p className="eyebrow">Eau de Parfum</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.pricesTitle}</h2>
            <p className="mt-4 text-cream/70">{t.home.pricesNote}</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {volumes.map((v) => (
              <div key={v.ml} className="card p-6">
                <p className="font-display text-5xl text-cream">
                  {v.ml}
                  <span className="text-2xl text-muted"> ml</span>
                </p>
                <p className="mt-4 text-champagne text-lg">{formatKzt(v.priceKzt, locale)}</p>
              </div>
            ))}
            {gift.enabled && (
              <div className="card p-6 border-gold/50">
                <p className="font-display text-5xl text-cream">
                  {gift.bottles}×{gift.volumeMl}
                  <span className="text-2xl text-muted"> ml</span>
                </p>
                <p className="mt-4 text-champagne text-lg">{formatKzt(gift.priceKzt, locale)}</p>
                <p className="mt-2 text-xs text-muted">{t.home.giftSet}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MATCHING */}
      <section className="container-lux py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <p className="eyebrow">AI Perfume Matching</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.matchTitle}</h2>
          <p className="mt-5 text-cream/70 max-w-lg">{t.home.matchText}</p>
          <p className="mt-4 text-xs text-muted max-w-lg">{t.match.disclaimer}</p>
          <Link href="/match" className="btn btn-ghost mt-8">
            {t.home.matchCta}
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="card p-6 sm:p-8 space-y-5" aria-hidden>
            <p className="eyebrow">{t.creator.balance}</p>
            {(["WOODY", "ORIENTAL", "FLORAL", "CITRUS"] as const).map((f, i) => (
              <div key={f}>
                <div className="flex justify-between text-sm">
                  <span className="text-cream/80">{t.families[f]}</span>
                </div>
                <div className="mt-2 h-[3px] rounded-full bg-ink-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${[42, 28, 18, 12][i]}%`, background: FAMILY_COLORS[f] }} />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* BOUTIQUE + CLOSING */}
      <section className="section-cream">
        <div className="container-lux py-20 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <p className="eyebrow">{t.boutique.title}</p>
            <h2 className="mt-4 text-4xl sm:text-5xl">{t.home.closingTitle}</h2>
            <p className="mt-5 text-soft max-w-lg">{t.boutique.subtitle}</p>
            <p className="mt-6 font-display text-2xl">{pick(boutique, "address", locale)}</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/create" className="btn btn-dark">
              {t.home.ctaCreate}
            </Link>
            <Link href="/boutique" className="btn border border-ink/30 text-ink hover:bg-ink hover:text-cream">
              {t.home.ctaBoutique}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
