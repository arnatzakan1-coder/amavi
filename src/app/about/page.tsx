import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Reveal } from "@/components/ui/Reveal";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.about.title, description: t.about.lead };
}

// Team listed in the pre-defence deck (Team 6).
const TEAM = [
  "Ashimbek Aidana",
  "Abdinagi Akbota",
  "Ametkhan Diara",
  "Kalmanbay Aknyet",
  "Kulzhanov Nurdaulet",
  "Nygmetolaeva Aigerim",
  "Otepbergen Altynay",
  "Sargaubek Bekzhan",
  "Serikbay Birganym",
];

export default async function AboutPage() {
  const { t } = await getI18n();
  return (
    <>
      <section className="container-lux pt-12 pb-20 sm:pt-20">
        <p className="eyebrow">{t.about.title}</p>
        <h1 className="mt-5 text-4xl sm:text-6xl max-w-4xl">{t.about.lead}</h1>
      </section>

      <section className="section-cream">
        <div className="container-lux py-20 sm:py-28 text-center">
          <p className="eyebrow">{t.about.mission}</p>
          <p className="mt-6 font-display text-3xl sm:text-5xl leading-tight max-w-4xl mx-auto">{t.about.missionText}</p>
          <p className="mt-6 text-soft max-w-xl mx-auto">{t.about.missionSub}</p>
        </div>
      </section>

      <section className="container-lux py-20 sm:py-28 grid lg:grid-cols-[1fr_1.4fr] gap-10">
        <Reveal>
          <h2 className="text-4xl sm:text-5xl">{t.about.whyTitle}</h2>
        </Reveal>
        <ol className="space-y-6">
          {t.about.why.map((w, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <li className="flex gap-6 border-b border-line pb-6 list-none">
                <span className="font-display text-3xl text-gold/80 w-10 shrink-0">0{i + 1}</span>
                <p className="text-cream/80 text-lg">{w}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-ink-2">
        <div className="container-lux py-20 sm:py-24">
          <h2 className="text-4xl sm:text-5xl">{t.about.modelTitle}</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {t.about.model.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.06}>
                <div className="card p-7 h-full">
                  <h3 className="text-3xl">{m.title}</h3>
                  <p className="mt-3 text-cream/75">{m.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted">{t.about.perfumer}</p>
        </div>
      </section>

      <section className="container-lux py-20">
        <h2 className="text-3xl">{t.about.team}</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {TEAM.map((n) => (
            <li key={n} className="chip text-cream/85 text-sm py-1.5 px-4">{n}</li>
          ))}
        </ul>
        <Link href="/create" className="btn btn-gold mt-12">{t.home.ctaCreate}</Link>
      </section>
    </>
  );
}
