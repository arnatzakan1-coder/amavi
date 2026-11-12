import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getNotes } from "@/lib/data";

const COLS = ["slug", "name_ru", "name_kk", "name_en", "family", "tier", "tier_verified", "intensity", "is_fixed", "fixed_parts", "min_parts", "max_parts", "max_share_pct", "desc_ru", "desc_kk", "desc_en", "active"];

export async function GET() {
  const u = await currentUser();
  if (u?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
  const notes = await getNotes();
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = notes.map((n) =>
    [n.slug, n.nameRu, n.nameKk, n.nameEn, n.family, n.tier, n.tierVerified, n.intensity, n.isFixed, n.fixedParts, n.minParts, n.maxParts, n.maxSharePct, n.descRu, n.descKk, n.descEn, n.active].map(esc).join(","),
  );
  const csv = "﻿" + [COLS.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="amavi-notes.csv"' },
  });
}
