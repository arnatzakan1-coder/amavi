"use client";
import { useI18n } from "@/i18n/client";
import { Dialog } from "@/components/ui/Dialog";
import { FAMILY_COLORS, type Family } from "@/lib/families";
import type { CreatorNote } from "./Creator";

export function NoteDialog({ note, onClose }: { note: CreatorNote; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog title={note.name} onClose={onClose} closeLabel={t.common.close}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-muted">{t.creator.family}</dt>
        <dd className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: FAMILY_COLORS[note.family as Family] }} aria-hidden />
          {t.families[note.family as Family]}
        </dd>
        <dt className="text-muted">{t.creator.level}</dt>
        <dd>
          {note.tier ? t.tiers[note.tier as "TOP"] : t.common.pending}
          {!note.tierVerified && <span className="chip ml-2">{t.common.draft}</span>}
        </dd>
        <dt className="text-muted">{t.creator.material}</dt>
        <dd>{note.material}</dd>
        <dt className="text-muted">{t.creator.intensity}</dt>
        <dd>
          {note.intensity ? (
            <span className="inline-flex gap-1" aria-label={`${note.intensity}/5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`h-1.5 w-5 rounded-full ${i <= note.intensity! ? "bg-champagne" : "bg-ink-3"}`} />
              ))}
            </span>
          ) : (
            <span className="text-muted">{t.common.pending}</span>
          )}
        </dd>
      </dl>
      <p className="mt-5 text-cream/80 leading-relaxed">{note.description ?? <span className="text-muted">{t.creator.noDescription}</span>}</p>
      {note.isFixed && <p className="mt-4 text-sm text-gold">{t.creator.fixedHint}</p>}
    </Dialog>
  );
}
