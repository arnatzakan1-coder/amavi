"use client";
import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Check, GripVertical, Info, Lock, Plus, Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { FAMILIES, FAMILY_COLORS, type Family } from "@/lib/families";
import type { CreatorNote } from "./Creator";

function PaletteItem({
  note,
  added,
  recommended,
  canAdd,
  onAdd,
  onInfo,
}: {
  note: CreatorNote;
  added: boolean;
  recommended: boolean;
  canAdd: boolean;
  onAdd: () => void;
  onInfo: () => void;
}) {
  const { t } = useI18n();
  const draggable = !note.isFixed && !added && canAdd;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${note.slug}`,
    data: { slug: note.slug },
    disabled: !draggable,
  });
  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${
        isDragging ? "opacity-40" : ""
      } ${added ? "border-gold/40 bg-gold/5" : "border-line hover:border-muted-dark"}`}
    >
      <span
        {...(draggable ? listeners : {})}
        {...(draggable ? attributes : {})}
        aria-label={draggable ? `${t.creator.dragHint}: ${note.name}` : undefined}
        className={`h-10 w-7 grid place-items-center text-muted-dark ${draggable ? "cursor-grab active:cursor-grabbing touch-none" : "opacity-40"}`}
      >
        <GripVertical size={16} aria-hidden />
      </span>
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: FAMILY_COLORS[note.family as Family] }} aria-hidden />
      <button type="button" onClick={onInfo} className="flex-1 min-w-0 text-left py-1.5">
        <span className="block truncate text-sm text-cream">{note.name}</span>
        <span className="block text-[0.7rem] text-muted truncate">
          {t.families[note.family as Family]}
          {note.tier ? ` · ${t.tiers[note.tier as "TOP"]}` : ""}
          {recommended && <span className="text-gold"> · {t.creator.recommended}</span>}
        </span>
      </button>
      <button type="button" onClick={onInfo} className="h-10 w-10 grid place-items-center rounded-full text-muted hover:text-cream hover:bg-ink-3" aria-label={`${note.name}: ${t.creator.material}`}>
        <Info size={15} aria-hidden />
      </button>
      {note.isFixed ? (
        <span className="h-10 w-10 grid place-items-center text-gold" title={t.creator.fixed} aria-label={t.creator.fixed}>
          <Lock size={15} aria-hidden />
        </span>
      ) : added ? (
        <span className="h-10 w-10 grid place-items-center text-gold" aria-label={t.creator.inComposition}>
          <Check size={16} aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="h-10 w-10 grid place-items-center rounded-full border border-line text-cream hover:border-champagne hover:text-champagne disabled:opacity-30"
          aria-label={`${t.creator.add}: ${note.name}`}
        >
          <Plus size={16} aria-hidden />
        </button>
      )}
    </li>
  );
}

export function NotePalette({
  notes,
  inComposition,
  recommended,
  canAddMore,
  onAdd,
  onInfo,
}: {
  notes: CreatorNote[];
  inComposition: Set<string>;
  recommended: Set<string>;
  canAddMore: boolean;
  onAdd: (slug: string) => void;
  onInfo: (slug: string) => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<Family | "ALL" | "REC">(recommended.size ? "REC" : "ALL");
  const { setNodeRef, isOver } = useDroppable({ id: "palette" });

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return notes.filter((n) => {
      if (family === "REC" && !recommended.has(n.family)) return false;
      if (family !== "ALL" && family !== "REC" && n.family !== family) return false;
      if (query && !n.name.toLowerCase().includes(query) && !n.slug.includes(query)) return false;
      return true;
    });
  }, [notes, q, family, recommended]);

  return (
    <section ref={setNodeRef} aria-labelledby="palette-title" className={`card p-4 sm:p-5 lg:sticky lg:top-[84px] transition-colors ${isOver ? "border-gold" : ""}`}>
      <div className="flex items-baseline justify-between">
        <h2 id="palette-title" className="text-2xl">{t.creator.palette}</h2>
        <span className="text-xs text-muted">{notes.length}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{t.creator.dragHint}</p>
      <div className="relative mt-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" aria-hidden />
        <label htmlFor="note-search" className="sr-only">{t.creator.search}</label>
        <input id="note-search" type="search" className="field pl-9" placeholder={t.creator.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label={t.creator.family}>
        {[
          ...(recommended.size ? [["REC", t.creator.recommended] as const] : []),
          ["ALL", t.creator.allFamilies] as const,
          ...FAMILIES.map((f) => [f, t.families[f]] as const),
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={family === key}
            onClick={() => setFamily(key as typeof family)}
            className={`chip min-h-[34px] shrink-0 transition-colors ${family === key ? "bg-champagne text-ink border-champagne" : "hover:text-cream"}`}
          >
            {key !== "ALL" && key !== "REC" && <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLORS[key as Family] }} aria-hidden />}
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto lg:pr-1">
        {list.map((n) => (
          <PaletteItem
            key={n.slug}
            note={n}
            added={inComposition.has(n.slug)}
            recommended={recommended.has(n.family)}
            canAdd={canAddMore}
            onAdd={() => onAdd(n.slug)}
            onInfo={() => onInfo(n.slug)}
          />
        ))}
      </ul>
    </section>
  );
}
