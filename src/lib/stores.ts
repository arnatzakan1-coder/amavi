"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Tier } from "./families";

export type CartItem = {
  key: string;
  formulaId: string;
  formulaName: string;
  volumeMl: number;
  concentrationPct: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  setVolume: (key: string, ml: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find(
            (i) => i.formulaId === item.formulaId && i.volumeMl === item.volumeMl && i.concentrationPct === item.concentrationPct,
          );
          if (existing) {
            return { items: s.items.map((i) => (i === existing ? { ...i, qty: Math.min(20, i.qty + qty), formulaName: item.formulaName } : i)) };
          }
          return { items: [...s.items, { ...item, qty, key: crypto.randomUUID() }] };
        }),
      setQty: (key, qty) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i)) })),
      setVolume: (key, ml) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, volumeMl: ml } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: "amavi-cart", storage: safeStorage },
  ),
);

export type DraftItem = { slug: string; parts: number; tier: Tier };

type DraftState = {
  formulaId: string | null;
  name: string;
  eventSlug: string | null;
  eventChosen: boolean;
  concentrationPct: number;
  items: DraftItem[];
  set: (patch: Partial<Omit<DraftState, "set" | "reset">>) => void;
  reset: (defaults?: Partial<Omit<DraftState, "set" | "reset">>) => void;
};

const emptyDraft = { formulaId: null, name: "", eventSlug: null, eventChosen: false, concentrationPct: 15, items: [] as DraftItem[] };

export const useDraft = create<DraftState>()(
  persist(
    (set) => ({
      ...emptyDraft,
      set: (patch) => set(patch),
      reset: (defaults) => set({ ...emptyDraft, ...defaults }),
    }),
    { name: "amavi-draft", storage: safeStorage },
  ),
);

/** Avoid SSR/client mismatch for persisted stores. */
import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
