"use client";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical, Lock, Minus, Plus, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { FAMILY_COLORS, type Family, type Tier } from "@/lib/families";
import type { DraftItem } from "@/lib/stores";
import type { CreatorNote } from "./Creator";

function ComposedNote({
  item,
  note,
  share,
  onRemove,
  onParts,
  onInfo,
}: {
  item: DraftItem;
  note: CreatorNote;
  share: number;
  onRemove: () => void;
  onParts: (p: number) => void;
  onInfo: () => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `composed:${item.slug}`,
    data: { slug: item.slug },
    disabled: note.isFixed,
  });
  const pct = Math.round(share * 100);
  return (
    <li ref={setNodeRef} className={`rounded-xl border border-line bg-ink/60 px-2 py-2 ${isDragging ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        {note.isFixed ? (
          <span className="h-10 w-7 grid place-items-center text-gold" title={t.creator.fixedHint}>
            <Lock size={14} aria-label={t.creator.fixed} />
          </span>
        ) : (
          <span {...listeners} {...attributes} className="h-10 w-7 grid place-items-center text-muted-dark cursor-grab touch-none" aria-label={`${t.creator.dragHint}: ${note.name}`}>
            <GripVertical size={16} aria-hidden />
          </span>
        )}
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: FAMILY_COLORS[note.family as Family] }} aria-hidden />
        <button type="button" onClick={onInfo} className="flex-1 min-w-0 text-left">
          <span className="block truncate text-sm">{note.name}</span>
          {note.isFixed && <span className="block text-[0.68rem] text-gold">{t.creator.fixed}</span>}
        </button>
        <span className="text-xs tabular-nums text-champagne w-9 text-right shrink-0" aria-label={`${pct}%`}>{pct}%</span>
        {!note.isFixed && (
          <>
            <div className="flex items-center rounded-full border border-line shrink-0">
              <button
                type="button"
                className="h-10 w-8 sm:w-9 grid place-items-center hover:text-champagne disabled:opacity-30"
                onClick={() => onParts(item.parts - 1)}
                disabled={item.parts <= note.minParts}
                aria-label={`− ${note.name}`}
              >
                <Minus size={14} aria-hidden />
              </button>
              <span className="w-6 sm:w-8 text-center text-sm tabular-nums" aria-live="polite" aria-label={`${t.creator.parts}: ${item.parts}`}>{item.parts}</span>
              <button
                type="button"
                className="h-10 w-8 sm:w-9 grid place-items-center hover:text-champagne disabled:opacity-30"
                onClick={() => onParts(item.parts + 1)}
                disabled={item.parts >= note.maxParts}
                aria-label={`+ ${note.name}`}
              >
                <Plus size={14} aria-hidden />
              </button>
            </div>
            <button type="button" onClick={onRemove} className="h-10 w-9 shrink-0 grid place-items-center rounded-full text-muted hover:text-danger hover:bg-ink-3" aria-label={`${t.creator.remove}: ${note.name}`}>
              <X size={16} aria-hidden />
            </button>
          </>
        )}
      </div>
      <div className="mt-1.5 mx-1 h-[2px] rounded-full bg-ink-3 overflow-hidden" aria-hidden>
        <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: FAMILY_COLORS[note.family as Family] }} />
      </div>
    </li>
  );
}

export function TierZone({
  tier,
  items,
  shares,
  notes,
  onRemove,
  onParts,
  onInfo,
}: {
  tier: Tier;
  items: DraftItem[];
  shares: Record<string, number>;
  notes: Map<string, CreatorNote>;
  onRemove: (slug: string) => void;
  onParts: (slug: string, parts: number) => void;
  onInfo: (slug: string) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: tier });
  const tierShare = Math.round(items.reduce((s, i) => s + (shares[i.slug] ?? 0), 0) * 100);
  return (
    <section
      ref={setNodeRef}
      aria-label={t.tiers[tier]}
      className={`card p-4 transition-[border-color,background-color] duration-200 ${isOver ? "border-champagne bg-champagne/5" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl">
          {t.tiers[tier]} <span className="text-xs font-sans text-muted ml-1">{t.tiers[`${tier}_hint` as "TOP_hint"]}</span>
        </h3>
        <span className="text-xs text-muted tabular-nums">{tierShare}%</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line py-5 text-center text-xs text-muted">{t.creator.dropHere}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((i) => {
            const n = notes.get(i.slug);
            if (!n) return null;
            return (
              <ComposedNote
                key={i.slug}
                item={i}
                note={n}
                share={shares[i.slug] ?? 0}
                onRemove={() => onRemove(i.slug)}
                onParts={(p) => onParts(i.slug, p)}
                onInfo={() => onInfo(i.slug)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
