"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Accessible modal: focus moves in, Escape / backdrop closes, focus returns on close. */
export function Dialog({
  title,
  onClose,
  children,
  closeLabel,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/70 sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="card w-full sm:max-w-lg max-h-[88vh] overflow-y-auto p-6 rounded-b-none sm:rounded-b-[18px] animate-fade-up outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="text-3xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="h-11 w-11 -mr-2 -mt-2 grid place-items-center rounded-full hover:bg-ink-3 shrink-0">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
