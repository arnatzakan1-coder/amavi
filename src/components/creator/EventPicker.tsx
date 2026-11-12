"use client";
import { useI18n } from "@/i18n/client";
import { FAMILY_COLORS, isFamily } from "@/lib/families";

export type CreatorEvent = { slug: string; name: string; families: string[] };

export function EventPicker({
  events,
  selected,
  onPick,
  onSkip,
}: {
  events: CreatorEvent[];
  selected: string | null;
  onPick: (slug: string) => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="event-title" className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">01 · {t.creator.stepEvent}</p>
          <h2 id="event-title" className="mt-3 text-3xl sm:text-4xl">{t.creator.eventTitle}</h2>
          <p className="mt-2 text-cream/70 max-w-2xl">{t.creator.eventText}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip}>{t.creator.eventSkip}</button>
      </div>
      <div className="mt-8 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {events.map((e, i) => (
          <button
            key={e.slug}
            type="button"
            onClick={() => onPick(e.slug)}
            aria-pressed={selected === e.slug}
            className={`group card text-left p-5 min-h-[132px] flex flex-col justify-between transition-[border-color,transform] duration-300 hover:border-champagne hover:-translate-y-0.5 ${
              selected === e.slug ? "border-champagne" : ""
            }`}
          >
            <span className="text-xs text-muted font-display">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="block font-display text-2xl leading-tight group-hover:text-champagne transition-colors">{e.name}</span>
              <span className="mt-3 flex gap-1.5" aria-hidden>
                {e.families.filter(isFamily).map((f) => (
                  <span key={f} className="h-1.5 w-6 rounded-full" style={{ background: FAMILY_COLORS[f] }} />
                ))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
