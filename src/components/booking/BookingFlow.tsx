"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CalendarCheck, Lock } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { formatKzt } from "@/lib/pricing";
import { formatKzPhoneInput, normalizeKzPhone } from "@/lib/phone";
import { almatyToUtc, depositFor, fmtHHMM, slotStarts, slotState, type PerfumerSchedule, type SlotSettings, type SlotState } from "@/lib/booking";
import { PREF_FAMILIES, PURPOSES, type Questionnaire } from "@/lib/questionnaire";
import { createBooking } from "@/app/actions/booking";

type Props = {
  nowMs: number;
  cfg: SlotSettings;
  days: string[];
  perfumers: (PerfumerSchedule & { name: string })[];
  taken: { perfumerId: string; startsAt: number }[];
  volumes: { ml: number; priceKzt: number }[];
  contact: { name: string; phone: string };
};

const STEPS = ["quiz", "slot", "confirm"] as const;

export function BookingFlow({ nowMs, cfg, days, perfumers, taken, volumes, contact }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<(typeof STEPS)[number]>("quiz");
  const [q, setQ] = useState<Questionnaire & { ageText: string }>({
    age: 0, ageText: "", families: [], purposes: [], likes: "", dislikes: "", extra: "", perfumeName: "",
  });
  const [showQuizErrors, setShowQuizErrors] = useState(false);
  const [lateTaken, setLateTaken] = useState<{ perfumerId: string; startsAt: number }[]>([]);
  const starts = useMemo(() => slotStarts(cfg), [cfg]);
  const bookedBy = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const b of [...taken, ...lateTaken]) {
      if (!m.has(b.perfumerId)) m.set(b.perfumerId, new Set());
      m.get(b.perfumerId)!.add(b.startsAt);
    }
    return m;
  }, [taken, lateTaken]);
  const stateOf = (pid: string, day: string, min: number): SlotState => {
    const p = perfumers.find((x) => x.id === pid)!;
    return slotState(p, day, min, cfg, bookedBy.get(pid) ?? new Set(), nowMs);
  };
  const freeCount = (day: string) => perfumers.reduce((n, p) => n + starts.filter((m) => stateOf(p.id, day, m) === "free").length, 0);
  const [day, setDay] = useState(() => days.find((d) => freeCount(d) > 0) ?? days[0]);
  const [slot, setSlot] = useState<{ perfumerId: string; day: string; startMin: number } | null>(null);
  const [volumeMl, setVolumeMl] = useState(volumes[0]?.ml ?? 10);
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone ? formatKzPhoneInput(contact.phone) : "+7 ");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dateLocale = locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU";
  const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) => {
    const [y, m, dd] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, dd, 12)).toLocaleDateString(dateLocale, { timeZone: "UTC", ...opts });
  };

  const ageOk = Number.isInteger(q.age) && q.age >= 14 && q.age <= 100;
  const quizOk = ageOk && q.families.length > 0 && q.purposes.length > 0;
  const toggle = (key: "families" | "purposes", v: string) =>
    setQ((s) => ({ ...s, [key]: (s[key] as string[]).includes(v) ? (s[key] as string[]).filter((x) => x !== v) : [...(s[key] as string[]), v] }));

  const volume = volumes.find((v) => v.ml === volumeMl) ?? volumes[0];
  const deposit = volume ? depositFor(volume.priceKzt, cfg.depositPct) : 0;
  const perfumerName = (id: string) => perfumers.find((p) => p.id === id)?.name ?? "";
  const phoneOk = normalizeKzPhone(phone) !== null;

  const submit = () => {
    if (!slot) return;
    setError(null);
    start(async () => {
      const { ageText: _a, ...questionnaire } = q;
      void _a;
      const res = await createBooking({ ...slot, volumeMl, name, phone, questionnaire, consent });
      if (res.ok) {
        setDone(res.number);
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setError(t.booking.errors[res.error] ?? t.common.error);
      if (res.error === "TAKEN" || res.error === "SLOT") {
        setLateTaken((l) => [...l, { perfumerId: slot.perfumerId, startsAt: almatyToUtc(slot.day, slot.startMin) }]);
        setSlot(null);
        setStep("slot");
      }
    });
  };

  if (done) {
    return (
      <div className="mt-10 card p-8 sm:p-12 max-w-2xl" role="status">
        <CalendarCheck size={34} strokeWidth={1.4} aria-hidden />
        <h2 className="mt-5 text-3xl sm:text-4xl">{t.booking.successTitle}</h2>
        <p className="mt-4 text-muted">{fmt(t.booking.successText, { number: done })}</p>
        {slot && (
          <p className="mt-4 font-medium">
            {perfumerName(slot.perfumerId)} · {dayLabel(slot.day, { weekday: "long", day: "numeric", month: "long" })} · {fmtHHMM(slot.startMin)}
          </p>
        )}
        <p className="mt-4 text-sm text-muted">{t.booking.depositNote}</p>
        <Link href="/account" className="btn btn-gold mt-8">{t.booking.toAccount}</Link>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);
  const Chip = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${
        on ? "bg-cream text-ink-2 border-cream" : "bg-ink-2 border-line hover:border-cream"
      }`}
    >
      {on && <Check size={14} className="inline mr-1.5 -mt-0.5" aria-hidden />}
      {label}
    </button>
  );

  return (
    <div className="mt-10">
      {/* Progress */}
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Steps">
        {[t.booking.stepQuiz, t.booking.stepSlot, t.booking.stepConfirm].map((label, i) => (
          <li key={label} className={`flex items-center gap-2 ${i === stepIndex ? "text-cream font-semibold" : "text-muted"}`} aria-current={i === stepIndex ? "step" : undefined}>
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 font-display ${i <= stepIndex ? "border-cream" : "border-line"} ${i < stepIndex ? "bg-cream text-ink-2" : ""}`}>
              {i < stepIndex ? <Check size={14} aria-hidden /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === "quiz" && (
        <form
          className="mt-8 card p-6 sm:p-10 grid gap-8 max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!quizOk) return setShowQuizErrors(true);
            setStep("slot");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          noValidate
        >
          <p className="flex gap-2 text-sm text-muted"><Lock size={15} className="mt-0.5 shrink-0" aria-hidden /> {t.booking.quizIntro}</p>

          <div className="max-w-[200px]">
            <label htmlFor="q-age" className="field-label">{t.booking.age} *</label>
            <input
              id="q-age"
              className="field"
              inputMode="numeric"
              autoComplete="off"
              value={q.ageText}
              aria-invalid={showQuizErrors && !ageOk}
              aria-describedby={showQuizErrors && !ageOk ? "q-age-err" : undefined}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                setQ((s) => ({ ...s, ageText: v, age: Number(v) || 0 }));
              }}
            />
            {showQuizErrors && !ageOk && <p id="q-age-err" className="field-error">{t.booking.ageInvalid}</p>}
          </div>

          <fieldset>
            <legend className="text-xl font-display uppercase">{t.booking.families} *</legend>
            <p className="text-xs text-muted mt-1">{t.booking.multi}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PREF_FAMILIES.map((f) => (
                <Chip key={f} on={q.families.includes(f)} label={t.booking.pref[f]} onClick={() => toggle("families", f)} />
              ))}
            </div>
            {showQuizErrors && q.families.length === 0 && <p className="field-error">{t.booking.pickOne}</p>}
          </fieldset>

          <fieldset>
            <legend className="text-xl font-display uppercase">{t.booking.purposes} *</legend>
            <p className="text-xs text-muted mt-1">{t.booking.multi}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <Chip key={p} on={q.purposes.includes(p)} label={t.booking.purpose[p]} onClick={() => toggle("purposes", p)} />
              ))}
            </div>
            {showQuizErrors && q.purposes.length === 0 && <p className="field-error">{t.booking.pickOne}</p>}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="q-likes" className="field-label">{t.booking.likes}</label>
              <textarea id="q-likes" className="field min-h-[96px]" maxLength={500} placeholder={t.booking.likesPh} value={q.likes} onChange={(e) => setQ((s) => ({ ...s, likes: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="q-dislikes" className="field-label">{t.booking.dislikes}</label>
              <textarea id="q-dislikes" className="field min-h-[96px]" maxLength={500} placeholder={t.booking.dislikesPh} value={q.dislikes} onChange={(e) => setQ((s) => ({ ...s, dislikes: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="q-extra" className="field-label">{t.booking.extra}</label>
            <textarea id="q-extra" className="field min-h-[96px]" maxLength={1000} placeholder={t.booking.extraPh} value={q.extra} onChange={(e) => setQ((s) => ({ ...s, extra: e.target.value }))} />
          </div>
          <div className="max-w-md">
            <label htmlFor="q-name" className="field-label">{t.booking.perfumeName}</label>
            <input id="q-name" className="field" maxLength={60} placeholder={t.booking.perfumeNamePh} value={q.perfumeName} onChange={(e) => setQ((s) => ({ ...s, perfumeName: e.target.value }))} />
          </div>

          <div>
            <button className="btn btn-gold">{t.booking.next} <ArrowRight size={16} aria-hidden /></button>
          </div>
        </form>
      )}

      {step === "slot" && (
        <section className="mt-8" aria-labelledby="sched-h">
          {error && <p className="mb-4 rounded-xl bg-ink-2 border border-danger/40 p-4 text-danger" role="alert">{error}</p>}
          <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-muted">{t.booking.chooseDay}</h2>
          <div className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t.booking.chooseDay}>
            {days.map((d) => {
              const n = freeCount(d);
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setDay(d)}
                  className={`shrink-0 min-w-[74px] rounded-2xl border px-3 py-2.5 text-center transition-colors ${
                    on ? "bg-cream text-ink-2 border-cream" : n ? "bg-ink-2 border-line hover:border-cream" : "bg-ink-3/60 border-line text-muted"
                  }`}
                >
                  <span className="block text-[0.7rem] uppercase tracking-[0.12em]">{dayLabel(d, { weekday: "short" })}</span>
                  <span className="block font-display text-2xl leading-tight">{dayLabel(d, { day: "numeric" })}</span>
                  <span className="block text-[0.68rem]">{dayLabel(d, { month: "short" })}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="sched-h" className="text-2xl sm:text-3xl">{t.booking.schedule}</h2>
              <p className="text-sm text-muted">{t.booking.scheduleHint} {fmt(t.booking.duration, { min: cfg.slotMinutes })}.</p>
            </div>
            <ul className="flex flex-wrap gap-4 text-xs text-muted" aria-label="Legend">
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-ink-2 border border-cream/60" aria-hidden />{t.booking.free}</li>
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-cream" aria-hidden />{t.booking.selected}</li>
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded slot-booked" aria-hidden />{t.booking.booked}</li>
              <li className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-ink-3 border border-line" aria-hidden />{t.booking.unavailable}</li>
            </ul>
          </div>

          {freeCount(day) === 0 && <p className="mt-4 text-sm text-muted">{t.booking.noSlots}</p>}

          <div className="mt-4 card p-3 sm:p-5 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1.5 sm:border-spacing-2 min-w-[300px]">
              <caption className="sr-only">{t.booking.schedule} · {dayLabel(day, { weekday: "long", day: "numeric", month: "long" })}</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-14 text-left text-xs font-normal text-muted">{t.booking.time}</th>
                  {perfumers.map((p) => (
                    <th key={p.id} scope="col" className="text-center font-display uppercase text-sm sm:text-lg font-normal pb-1">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {starts.map((m) => (
                  <tr key={m}>
                    <th scope="row" className="text-left text-xs sm:text-sm font-normal tabular text-muted whitespace-nowrap">{fmtHHMM(m)}</th>
                    {perfumers.map((p) => {
                      const st = stateOf(p.id, day, m);
                      const sel = slot?.perfumerId === p.id && slot.day === day && slot.startMin === m;
                      const label = st === "free" ? t.booking.free : st === "booked" ? t.booking.booked : t.booking.unavailable;
                      return (
                        <td key={p.id}>
                          <button
                            type="button"
                            disabled={st !== "free"}
                            aria-pressed={sel}
                            aria-label={`${p.name}, ${fmtHHMM(m)}–${fmtHHMM(m + cfg.slotMinutes)}: ${sel ? t.booking.selected : label}`}
                            onClick={() => setSlot({ perfumerId: p.id, day, startMin: m })}
                            className={`w-full min-h-[48px] rounded-xl text-xs sm:text-sm transition-colors ${
                              sel
                                ? "bg-cream text-ink-2 font-semibold shadow-md"
                                : st === "free"
                                  ? "bg-ink-2 border border-cream/40 hover:border-cream hover:bg-white"
                                  : st === "booked"
                                    ? "slot-booked text-muted line-through"
                                    : "bg-ink-3 border border-line text-muted-dark"
                            }`}
                          >
                            {sel ? <Check size={16} className="mx-auto" aria-hidden /> : st === "free" ? fmtHHMM(m) : st === "booked" ? t.booking.booked : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setStep("quiz")}><ArrowLeft size={16} aria-hidden /> {t.booking.back}</button>
            <button type="button" className="btn btn-gold" disabled={!slot} onClick={() => { setError(null); setStep("confirm"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              {t.booking.next} <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </section>
      )}

      {step === "confirm" && slot && volume && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
          <form
            className="card p-6 sm:p-8 grid gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <fieldset>
              <legend className="text-xl font-display uppercase">{t.booking.volume}</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {volumes.map((v) => (
                  <label key={v.ml} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${volumeMl === v.ml ? "border-cream bg-ink-3" : "border-line hover:border-cream"}`}>
                    <input type="radio" name="volume" className="sr-only" checked={volumeMl === v.ml} onChange={() => setVolumeMl(v.ml)} />
                    <span className="block font-display text-3xl">{v.ml} <span className="text-lg text-muted">ml</span></span>
                    <span className="block mt-1 font-semibold">{formatKzt(v.priceKzt, locale)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b-name" className="field-label">{t.booking.name} *</label>
                <input id="b-name" className="field" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="b-phone" className="field-label">{t.booking.phone} *</label>
                <input
                  id="b-phone"
                  className="field tabular"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  aria-invalid={phone.length > 4 && !phoneOk}
                  aria-describedby="b-phone-hint"
                  onChange={(e) => setPhone(formatKzPhoneInput(e.target.value))}
                />
                <p id="b-phone-hint" className={`mt-1 text-xs ${phone.length > 4 && !phoneOk ? "text-danger" : "text-muted"}`}>
                  {phone.length > 4 && !phoneOk ? t.checkout.phoneInvalid : t.checkout.phoneHint}
                </p>
              </div>
            </div>
            <label className="flex gap-3 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[#2c0a71]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.booking.consent}</span>
            </label>
            {error && <p className="text-danger text-sm" role="alert">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("slot")}><ArrowLeft size={16} aria-hidden /> {t.booking.back}</button>
              <button className="btn btn-gold" disabled={pending || !consent || !name.trim() || !phoneOk}>
                {pending ? t.booking.confirming : t.booking.confirm}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl bg-cream text-ink-2 p-6 sm:p-8" aria-label={t.booking.summary}>
            <h2 className="text-2xl">{t.booking.summary}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="opacity-75">{t.booking.perfumer}</dt><dd className="text-right font-medium">{perfumerName(slot.perfumerId)}</dd></div>
              <div className="flex justify-between gap-4">
                <dt className="opacity-75">{t.booking.when}</dt>
                <dd className="text-right font-medium">{dayLabel(slot.day, { weekday: "short", day: "numeric", month: "long" })}, {fmtHHMM(slot.startMin)}–{fmtHHMM(slot.startMin + cfg.slotMinutes)}</dd>
              </div>
              <div className="flex justify-between gap-4"><dt className="opacity-75">{t.booking.volume}</dt><dd className="font-medium">{volume.ml} ml · EDP</dd></div>
              <div className="flex justify-between gap-4 border-t border-ink-2/25 pt-3"><dt className="opacity-75">{t.booking.price}</dt><dd className="font-medium tabular">{formatKzt(volume.priceKzt, locale)}</dd></div>
              <div className="flex justify-between gap-4 text-base"><dt>{fmt(t.booking.deposit, { pct: cfg.depositPct })}</dt><dd className="font-semibold tabular">{formatKzt(deposit, locale)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="opacity-75">{t.booking.balance}</dt><dd className="tabular">{formatKzt(volume.priceKzt - deposit, locale)}</dd></div>
            </dl>
            <p className="mt-5 text-xs opacity-80">{t.home.consultationIncluded}. {t.booking.depositNote}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
