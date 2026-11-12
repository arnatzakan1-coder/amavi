"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertCircle, CheckCircle2, Info, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { useCart, useDraft, useHydrated, type DraftItem } from "@/lib/stores";
import { evaluate, withFixedNotes, blendColor, dominantFamilies, type CompositionRules, type NoteRule, type Pair } from "@/lib/composition";
import { FAMILY_COLORS, TIERS, type Family, type Tier } from "@/lib/families";
import { formatKzt } from "@/lib/pricing";
import { saveFormula } from "@/app/actions/formulas";
import { Bottle } from "@/components/bottle/Bottle";
import { EventPicker, type CreatorEvent } from "./EventPicker";
import { NotePalette } from "./NotePalette";
import { TierZone } from "./TierZone";
import { Balance } from "./Balance";
import { NoteDialog } from "./NoteDialog";
import { Dialog } from "@/components/ui/Dialog";
import { validationMessage } from "./messages";

export type CreatorNote = NoteRule & {
  name: string;
  description: string | null;
  material: string;
  intensity: number | null;
  tierVerified: boolean;
};

type Props = {
  notes: CreatorNote[];
  rules: CompositionRules;
  pairs: Pair[];
  events: CreatorEvent[];
  concentrations: { pct: number; isDefault: boolean }[];
  volumes: { ml: number; priceKzt: number }[];
  loggedIn: boolean;
  initial: { formulaId: string | null; name: string; eventSlug: string | null; concentrationPct: number; items: DraftItem[] } | null;
};

const DEFAULT_PARTS = 3;

export function Creator({ notes, rules, pairs, events, concentrations, volumes, loggedIn, initial }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useDraft();
  const addToCart = useCart((s) => s.add);
  const [announce, setAnnounce] = useState("");
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [infoSlug, setInfoSlug] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{ kind: "idle" | "saved" | "error" | "auth"; msg?: string }>({ kind: "idle" });
  const [orderOpen, setOrderOpen] = useState(false);
  const [pending, start] = useTransition();
  const loadedInitial = useRef(false);

  const bySlug = useMemo(() => new Map(notes.map((n) => [n.slug, n])), [notes]);
  const nameOf = (slug: string) => bySlug.get(slug)?.name ?? slug;
  const defaultConc = concentrations.find((c) => c.isDefault)?.pct ?? concentrations[0]?.pct ?? 20;

  // Load a saved / collection formula once.
  useEffect(() => {
    if (!hydrated || loadedInitial.current) return;
    loadedInitial.current = true;
    if (initial) {
      draft.reset({ ...initial, eventChosen: true });
    } else if (!concentrations.some((c) => c.pct === draft.concentrationPct)) {
      draft.set({ concentrationPct: defaultConc });
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => withFixedNotes(draft.items, notes), [draft.items, notes]);
  const result = useMemo(
    () => evaluate(items, notes, rules, pairs, draft.concentrationPct, concentrations.map((c) => c.pct)),
    [items, notes, rules, pairs, draft.concentrationPct, concentrations],
  );
  const color = blendColor(result.familyBalance, FAMILY_COLORS);
  const event = events.find((e) => e.slug === draft.eventSlug) ?? null;
  const recommended = new Set<string>(event?.families ?? []);
  const inComposition = new Set(items.map((i) => i.slug));
  const anyDraftTiers = notes.some((n) => !n.tierVerified);

  const setItems = (next: DraftItem[]) => {
    draft.set({ items: next.filter((i) => !bySlug.get(i.slug)?.isFixed) });
    setSaveState({ kind: "idle" });
  };

  const tierFor = (slug: string, requested?: Tier): Tier => {
    const n = bySlug.get(slug);
    return (n?.tier as Tier) ?? requested ?? "HEART";
  };

  const addNote = (slug: string, requested?: Tier) => {
    const n = bySlug.get(slug);
    if (!n || n.isFixed) return;
    const tier = tierFor(slug, requested);
    if (requested && n.tier && requested !== n.tier) setAnnounce(fmt(t.creator.moved, { tier: t.tiers[tier] }));
    const existing = draft.items.find((i) => i.slug === slug);
    if (existing) {
      if (existing.tier !== tier) setItems(draft.items.map((i) => (i.slug === slug ? { ...i, tier } : i)));
      return;
    }
    const parts = Math.min(n.maxParts, Math.max(n.minParts, DEFAULT_PARTS));
    setItems([...draft.items, { slug, parts, tier }]);
    if (!requested || requested === tier) setAnnounce(`${n.name} → ${t.tiers[tier]}`);
  };

  const removeNote = (slug: string) => setItems(draft.items.filter((i) => i.slug !== slug));
  const setParts = (slug: string, parts: number) => {
    const n = bySlug.get(slug);
    if (!n) return;
    const p = Math.min(n.maxParts, Math.max(n.minParts, Math.round(parts)));
    setItems(draft.items.map((i) => (i.slug === slug ? { ...i, parts: p } : i)));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const onDragStart = (e: DragStartEvent) => setActiveDrag(String(e.active.data.current?.slug ?? ""));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const slug = e.active.data.current?.slug as string | undefined;
    const over = e.over?.id as string | undefined;
    if (!slug || !over) return;
    if (over === "palette") return removeNote(slug);
    if ((TIERS as readonly string[]).includes(over)) addNote(slug, over as Tier);
  };

  const doSave = async (): Promise<string | null> => {
    if (!loggedIn) {
      setSaveState({ kind: "auth" });
      return null;
    }
    const name = draft.name.trim() || "AMAVI Signature";
    const res = await saveFormula({
      id: draft.formulaId,
      name,
      eventSlug: draft.eventSlug,
      concentrationPct: draft.concentrationPct,
      items: draft.items,
    });
    if (res.ok) {
      draft.set({ formulaId: res.id, name });
      setSaveState({ kind: "saved" });
      return res.id;
    }
    if (res.reason === "RULES") setSaveState({ kind: "error", msg: res.errors.map((e) => validationMessage(e, t, nameOf)).join(" ") });
    else if (res.reason === "AUTH") setSaveState({ kind: "auth" });
    else if (res.reason === "NOT_FOUND") {
      draft.set({ formulaId: null });
      setSaveState({ kind: "error", msg: t.common.error });
    } else setSaveState({ kind: "error", msg: t.common.error });
    return null;
  };

  const onSave = () => start(async () => void (await doSave()));
  const onOrder = () => {
    if (!loggedIn) return setSaveState({ kind: "auth" });
    start(async () => {
      const id = await doSave();
      if (id) setOrderOpen(true);
    });
  };
  const addAndGo = (ml: number) => {
    if (!draft.formulaId) return;
    addToCart({ formulaId: draft.formulaId, formulaName: draft.name || "AMAVI Signature", volumeMl: ml, concentrationPct: draft.concentrationPct });
    router.push("/cart");
  };

  if (!hydrated) {
    return <div className="card h-[60vh] animate-pulse" aria-busy="true" aria-label={t.common.loading} />;
  }

  if (!draft.eventChosen) {
    return (
      <EventPicker
        events={events}
        selected={draft.eventSlug}
        onPick={(slug) => draft.set({ eventSlug: slug, eventChosen: true })}
        onSkip={() => draft.set({ eventSlug: null, eventChosen: true })}
      />
    );
  }

  const tiers = TIERS.map((tier) => ({ tier, items: items.filter((i) => i.tier === tier) }));
  const character = dominantFamilies(result.familyBalance);
  const activeNote = activeDrag ? bySlug.get(activeDrag) : null;
  const visibleErrors = result.errors.filter((e) => e.code !== "EMPTY");

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
      <p className="sr-only" aria-live="polite">{announce}</p>

      {/* Step bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button type="button" onClick={() => draft.set({ eventChosen: false })} className="chip hover:text-cream hover:border-gold min-h-[36px]">
          {t.creator.stepEvent}: <span className="text-champagne">{event?.name ?? t.creator.eventSkip}</span>
        </button>
        <span className="chip">
          {t.creator.inComposition}: <span className="text-champagne">{items.length}</span> / {rules.maxNotes} {t.creator.notes}
        </span>
        <button
          type="button"
          onClick={() => {
            if (confirm(t.creator.reset + "?")) draft.reset({ eventChosen: true, eventSlug: draft.eventSlug, concentrationPct: defaultConc });
          }}
          className="chip hover:text-cream min-h-[36px] ml-auto"
        >
          <RotateCcw size={13} aria-hidden /> {t.creator.reset}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] xl:grid-cols-[340px_1fr_360px]">
        {/* Palette */}
        <div className="order-3 lg:order-1 lg:row-span-2 min-w-0">
          <NotePalette
            notes={notes}
            inComposition={inComposition}
            recommended={recommended}
            canAddMore={items.length < rules.maxNotes}
            onAdd={(slug) => addNote(slug)}
            onInfo={setInfoSlug}
          />
        </div>

        {/* Bottle + pyramid */}
        <section className="order-1 lg:order-2 space-y-5 min-w-0" aria-label={t.creator.composition}>
          <div className="card relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(55% 60% at 50% 45%, ${color}33, transparent 70%)` }}
            />
            <Bottle
              className="h-[300px] sm:h-[380px]"
              liquidColor={color}
              fill={items.length ? 0.35 + Math.min(0.45, result.totalParts / 60) : 0.12}
              label={draft.name || "Signature"}
              ariaLabel={t.creator.bottle3d}
              interactive
            />
            <div className="absolute left-4 bottom-4 right-4 flex flex-wrap gap-2" aria-label={t.creator.character}>
              {character.map((f) => (
                <span key={f} className="chip bg-ink/70 backdrop-blur text-cream/90">
                  <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[f] }} aria-hidden />
                  {t.families[f]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
            {tiers.map(({ tier, items: tierItems }) => (
              <TierZone
                key={tier}
                tier={tier}
                items={tierItems}
                shares={result.shares}
                notes={bySlug}
                onRemove={removeNote}
                onParts={setParts}
                onInfo={setInfoSlug}
              />
            ))}
          </div>
          {items.length === 0 && <p className="text-sm text-muted">{t.creator.empty}</p>}
        </section>

        {/* Summary */}
        <aside className="order-2 lg:order-3 lg:col-start-2 xl:col-start-3 xl:row-start-1 space-y-5 min-w-0" aria-label={t.creator.stepReview}>
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl">{t.creator.balance}</h2>
            <Balance balance={result.familyBalance} />
          </div>

          <div className="card p-5 sm:p-6">
            <fieldset>
              <legend className="text-2xl font-display">{t.creator.concentration}</legend>
              <p className="text-xs text-muted mt-1">{t.creator.concentrationHint}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {concentrations.map((c) => (
                  <label
                    key={c.pct}
                    className={`cursor-pointer rounded-xl border px-2 py-3 text-center transition-colors ${
                      draft.concentrationPct === c.pct ? "border-champagne bg-champagne/10" : "border-line hover:border-muted-dark"
                    }`}
                  >
                    <input
                      type="radio"
                      name="conc"
                      className="sr-only"
                      checked={draft.concentrationPct === c.pct}
                      onChange={() => draft.set({ concentrationPct: c.pct })}
                    />
                    <span className="block font-display text-2xl">{c.pct}%</span>
                    <span className="block text-[0.7rem] text-muted mt-1">{t.creator.intensityByConc[c.pct] ?? ""}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="card p-5 sm:p-6 space-y-4">
            <div aria-live="polite">
              {result.ok ? (
                <p className="flex gap-2 text-sm text-ok"><CheckCircle2 size={18} className="shrink-0" aria-hidden /> {t.creator.valid}</p>
              ) : visibleErrors.length > 0 ? (
                <ul className="space-y-1.5">
                  {visibleErrors.slice(0, 4).map((e, i) => (
                    <li key={i} className="flex gap-2 text-sm text-danger">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
                      {validationMessage(e, t, nameOf)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t.creator.empty}</p>
              )}
            </div>

            <div>
              <label htmlFor="formula-name" className="field-label">{t.creator.nameLabel}</label>
              <input
                id="formula-name"
                className="field"
                maxLength={60}
                value={draft.name}
                placeholder={t.creator.namePlaceholder}
                onChange={(e) => draft.set({ name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <button type="button" className="btn btn-gold w-full" disabled={!result.ok || pending} onClick={onOrder}>
                {pending ? t.common.saving : t.creator.order}
              </button>
              <div className="grid gap-2">
                <button type="button" className="btn btn-ghost btn-sm w-full" disabled={!result.ok || pending} onClick={onSave}>
                  {draft.formulaId ? t.creator.updateFormula : t.creator.saveFormula}
                </button>
                <Link href="/match" className={`btn btn-ghost btn-sm w-full ${items.length === 0 ? "pointer-events-none opacity-45" : ""}`} aria-disabled={items.length === 0}>
                  <Sparkles size={14} aria-hidden /> {t.creator.findMatch}
                </Link>
              </div>
            </div>

            <div aria-live="polite" className="text-sm">
              {saveState.kind === "saved" && <p className="text-ok">{t.common.saved}</p>}
              {saveState.kind === "error" && <p className="text-danger">{saveState.msg}</p>}
              {saveState.kind === "auth" && (
                <p className="text-cream/80">
                  {t.creator.loginToSave}{" "}
                  <Link className="text-champagne underline underline-offset-4" href="/login?next=/create">{t.nav.login}</Link>
                </p>
              )}
            </div>

            {(anyDraftTiers || !rules.verified) && (
              <p className="flex gap-2 text-xs text-muted border-t border-line pt-4">
                <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
                <span>
                  {anyDraftTiers && t.creator.tierDraft} {!rules.verified && t.creator.rulesDraft}
                </span>
              </p>
            )}
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNote ? (
          <div className="chip bg-ink-3 text-cream border-gold shadow-2xl px-4 py-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[activeNote.family as Family] }} aria-hidden />
            {activeNote.name}
          </div>
        ) : null}
      </DragOverlay>

      {infoSlug && bySlug.get(infoSlug) && <NoteDialog note={bySlug.get(infoSlug)!} onClose={() => setInfoSlug(null)} />}

      {orderOpen && (
        <Dialog title={t.cart.chooseVolume} onClose={() => setOrderOpen(false)} closeLabel={t.common.close}>
          <p className="text-sm text-muted">{draft.name} · {draft.concentrationPct}%</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {volumes.map((v) => (
              <button key={v.ml} type="button" className="card p-5 text-left hover:border-champagne transition-colors" onClick={() => addAndGo(v.ml)}>
                <span className="block font-display text-4xl">{v.ml} <span className="text-xl text-muted">ml</span></span>
                <span className="block mt-2 text-champagne">{formatKzt(v.priceKzt, locale)}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </DndContext>
  );
}
