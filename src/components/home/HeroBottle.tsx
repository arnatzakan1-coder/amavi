"use client";
import { useEffect, useState } from "react";
import { Bottle } from "@/components/bottle/Bottle";
import { useI18n } from "@/i18n/client";
import { FAMILY_COLORS } from "@/lib/families";

// The hero bottle slowly cycles through family colours to hint at personalisation.
const CYCLE = [FAMILY_COLORS.CITRUS, FAMILY_COLORS.FLORAL, FAMILY_COLORS.ORIENTAL, FAMILY_COLORS.WOODY];

export function HeroBottle() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % CYCLE.length), 3600);
    return () => clearInterval(id);
  }, []);
  return <Bottle className="h-full w-full" liquidColor={CYCLE[i]} fill={0.74} label="Signature" ariaLabel={t.creator.bottle3d} interactive />;
}
