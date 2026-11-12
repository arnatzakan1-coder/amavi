"use server";
// All admin mutations. Every action re-checks the ADMIN role against the database.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { assertAdmin } from "@/lib/session";
import { setSetting, getSetting } from "@/lib/data";
import { FAMILIES, TIERS, isFamily, isTier } from "@/lib/families";
import { ORDER_STATUSES } from "@/lib/order-status";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => (str(f, k) === "" ? null : str(f, k));
const num = (f: FormData, k: string) => (str(f, k) === "" ? null : Number(str(f, k)));
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ───────── Notes ─────────
export async function updateNote(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const tier = str(form, "tier");
  const family = str(form, "family");
  const minParts = Math.max(1, Math.round(num(form, "minParts") ?? 1));
  const maxParts = Math.max(minParts, Math.round(num(form, "maxParts") ?? 10));
  const intensity = num(form, "intensity");
  const maxShare = num(form, "maxSharePct");
  const fixedParts = num(form, "fixedParts");
  await db
    .update(s.notes)
    .set({
      nameRu: str(form, "nameRu"),
      nameKk: str(form, "nameKk"),
      nameEn: str(form, "nameEn"),
      family: isFamily(family) ? family : undefined,
      descRu: optStr(form, "descRu"),
      descKk: optStr(form, "descKk"),
      descEn: optStr(form, "descEn"),
      tier: isTier(tier) ? tier : null,
      tierVerified: bool(form, "tierVerified"),
      intensity: intensity && intensity >= 1 && intensity <= 5 ? Math.round(intensity) : null,
      isFixed: bool(form, "isFixed"),
      fixedParts: fixedParts != null ? Math.max(1, Math.round(fixedParts)) : null,
      minParts,
      maxParts,
      maxSharePct: maxShare != null && maxShare > 0 && maxShare <= 100 ? maxShare : null,
      perfumerVerified: bool(form, "perfumerVerified"),
      active: bool(form, "active"),
      updatedAt: new Date(),
    })
    .where(eq(s.notes.id, id));
  revalidateAll();
  redirect("/admin/notes?saved=1");
}

/** CSV import. Header row required; known columns are updated by `slug`.
 *  Columns: slug,name_ru,name_kk,name_en,family,tier,tier_verified,intensity,is_fixed,fixed_parts,min_parts,max_parts,max_share_pct,desc_ru,desc_kk,desc_en,active */
export async function importNotesCsv(form: FormData) {
  await assertAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 500_000) redirect("/admin/notes?import=bad");
  const text = await (file as File).text();
  const rows = parseCsv(text);
  const [header, ...data] = rows;
  if (!header || !header.includes("slug")) redirect("/admin/notes?import=bad");
  let updated = 0;
  for (const r of data) {
    const rec = Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()]));
    if (!rec.slug) continue;
    const patch: Partial<typeof s.notes.$inferInsert> = {};
    if (rec.name_ru) patch.nameRu = rec.name_ru;
    if (rec.name_kk) patch.nameKk = rec.name_kk;
    if (rec.name_en) patch.nameEn = rec.name_en;
    if (isFamily(rec.family ?? "")) patch.family = rec.family;
    if (rec.tier !== undefined) patch.tier = isTier(rec.tier) ? rec.tier : null;
    if (rec.tier_verified) patch.tierVerified = /^(1|true|yes|да)$/i.test(rec.tier_verified);
    if (rec.intensity) patch.intensity = Math.min(5, Math.max(1, Number(rec.intensity) || 0)) || null;
    if (rec.is_fixed) patch.isFixed = /^(1|true|yes|да)$/i.test(rec.is_fixed);
    if (rec.fixed_parts) patch.fixedParts = Number(rec.fixed_parts) || null;
    if (rec.min_parts) patch.minParts = Math.max(1, Number(rec.min_parts) || 1);
    if (rec.max_parts) patch.maxParts = Math.max(1, Number(rec.max_parts) || 10);
    if (rec.max_share_pct) patch.maxSharePct = Number(rec.max_share_pct) || null;
    if (rec.desc_ru) patch.descRu = rec.desc_ru;
    if (rec.desc_kk) patch.descKk = rec.desc_kk;
    if (rec.desc_en) patch.descEn = rec.desc_en;
    if (rec.active) patch.active = /^(1|true|yes|да)$/i.test(rec.active);
    if (Object.keys(patch).length === 0) continue;
    const res = await db.update(s.notes).set({ ...patch, updatedAt: new Date() }).where(eq(s.notes.slug, rec.slug)).returning({ id: s.notes.id });
    updated += res.length;
  }
  revalidateAll();
  redirect(`/admin/notes?import=${updated}`);
}

function parseCsv(text: string): string[][] {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows.map((r) => r.map((x) => x.replace(/^﻿/, "")));
}

// ───────── Rules ─────────
export async function updateRules(form: FormData) {
  await assertAdmin();
  const maxNotes = Math.min(30, Math.max(1, Math.round(num(form, "maxNotes") ?? 10)));
  const minNotesPerTier = Math.min(10, Math.max(0, Math.round(num(form, "minNotesPerTier") ?? 1)));
  await setSetting("rules", { maxNotes, minNotesPerTier, verified: bool(form, "verified") });
  revalidateAll();
  redirect("/admin/rules?saved=1");
}

export async function addPair(form: FormData) {
  await assertAdmin();
  const [a, b] = [str(form, "noteA"), str(form, "noteB")].sort();
  if (a && b && a !== b) await db.insert(s.incompatiblePairs).values({ noteA: a, noteB: b, reason: optStr(form, "reason") }).onConflictDoNothing();
  revalidateAll();
  redirect("/admin/rules?saved=1");
}

export async function deletePair(form: FormData) {
  await assertAdmin();
  await db.delete(s.incompatiblePairs).where(eq(s.incompatiblePairs.id, str(form, "id")));
  revalidateAll();
  redirect("/admin/rules");
}

// ───────── Pricing, delivery, payment ─────────
export async function updatePricing(form: FormData) {
  await assertAdmin();
  for (const v of await db.select().from(s.volumes)) {
    const price = num(form, `vol_${v.id}`);
    await db.update(s.volumes).set({ priceKzt: price != null && price >= 0 ? Math.round(price) : v.priceKzt, active: bool(form, `vol_active_${v.id}`) }).where(eq(s.volumes.id, v.id));
  }
  const newMl = num(form, "new_ml");
  const newPrice = num(form, "new_price");
  if (newMl && newPrice != null && newMl > 0 && newPrice >= 0) {
    await db.insert(s.volumes).values({ ml: Math.round(newMl), priceKzt: Math.round(newPrice), sortOrder: Math.round(newMl) }).onConflictDoNothing();
  }
  for (const c of await db.select().from(s.concentrations)) {
    const sur = num(form, `conc_${c.id}`);
    await db.update(s.concentrations).set({ surchargeKzt: sur != null && sur >= 0 ? Math.round(sur) : 0, active: bool(form, `conc_active_${c.id}`), isDefault: str(form, "conc_default") === c.id }).where(eq(s.concentrations.id, c.id));
  }
  const gs = await getSetting("giftSet");
  await setSetting("giftSet", {
    enabled: bool(form, "gift_enabled"),
    bottles: Math.max(2, Math.round(num(form, "gift_bottles") ?? gs.bottles)),
    volumeMl: Math.round(num(form, "gift_volume") ?? gs.volumeMl),
    priceKzt: Math.max(0, Math.round(num(form, "gift_price") ?? gs.priceKzt)),
  });
  for (const d of await db.select().from(s.deliveryMethods)) {
    const p = num(form, `del_${d.id}`);
    await db.update(s.deliveryMethods).set({ priceKzt: p != null && p >= 0 ? Math.round(p) : null, active: bool(form, `del_active_${d.id}`) }).where(eq(s.deliveryMethods.id, d.id));
  }
  for (const p of await db.select().from(s.paymentMethods)) {
    await db.update(s.paymentMethods).set({ active: bool(form, `pay_active_${p.id}`) }).where(eq(s.paymentMethods.id, p.id));
  }
  revalidateAll();
  redirect("/admin/pricing?saved=1");
}

// ───────── Orders ─────────

export async function updateOrderStatus(form: FormData) {
  await assertAdmin();
  const id = str(form, "id");
  const status = str(form, "status");
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) redirect(`/admin/orders/${id}`);
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) redirect("/admin/orders");
  await db
    .update(s.orders)
    .set({ status, updatedAt: new Date(), ...(status === "PAID" && !order.paidAt ? { paidAt: new Date() } : {}) })
    .where(eq(s.orders.id, id));
  await db.insert(s.orderEvents).values({ orderId: id, status, note: optStr(form, "note") });
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  redirect(`/admin/orders/${id}?saved=1`);
}

// ───────── Inquiries ─────────
export async function updateInquiry(form: FormData) {
  await assertAdmin();
  const status = str(form, "status");
  if (["NEW", "IN_PROGRESS", "DONE"].includes(status)) await db.update(s.inquiries).set({ status }).where(eq(s.inquiries.id, str(form, "id")));
  revalidatePath("/admin/inquiries");
  redirect("/admin/inquiries");
}

// ───────── Boutique ─────────
export async function updateBoutique(form: FormData) {
  await assertAdmin();
  const lat = num(form, "lat");
  const lon = num(form, "lon");
  const url = optStr(form, "twoGisUrl");
  const phone = str(form, "phone").replace(/[^\d+]/g, "");
  await setSetting("boutique", {
    addressRu: str(form, "addressRu"),
    addressKk: str(form, "addressKk"),
    addressEn: str(form, "addressEn"),
    areaM2: num(form, "areaM2"),
    lat: lat != null && Math.abs(lat) <= 90 ? lat : null,
    lon: lon != null && Math.abs(lon) <= 180 ? lon : null,
    twoGisUrl: url && /^https:\/\/(go\.)?2gis\.(kz|ru|com)\//.test(url) ? url : null,
    hours: optStr(form, "hours"),
    phone: phone || "+77751234567",
    whatsapp: phone.replace(/\D/g, "") || "77751234567",
    listingUrl: optStr(form, "listingUrl"),
    leaseSigned: bool(form, "leaseSigned"),
  });
  revalidateAll();
  redirect("/admin/boutique?saved=1");
}

// ───────── Events ─────────
export async function saveEvent(form: FormData) {
  await assertAdmin();
  const id = optStr(form, "id");
  const fams = FAMILIES.filter((f) => bool(form, `fam_${f}`)).join(",");
  const data = {
    nameRu: str(form, "nameRu"),
    nameKk: str(form, "nameKk"),
    nameEn: str(form, "nameEn"),
    recommendedFamilies: fams,
    sortOrder: Math.round(num(form, "sortOrder") ?? 0),
    active: bool(form, "active"),
  };
  if (!data.nameRu) redirect("/admin/events");
  if (id) await db.update(s.eventCategories).set(data).where(eq(s.eventCategories.id, id));
  else {
    const slug = (str(form, "slug") || data.nameEn || data.nameRu).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `event-${Date.now()}`;
    await db.insert(s.eventCategories).values({ slug, ...data }).onConflictDoNothing();
  }
  revalidateAll();
  redirect("/admin/events?saved=1");
}

// ───────── Niche catalogue ─────────
const slugList = (v: string) => v.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);

export async function saveNiche(form: FormData) {
  await assertAdmin();
  const id = optStr(form, "id");
  const noteSlugs = new Set((await db.select({ slug: s.notes.slug }).from(s.notes)).map((n) => n.slug));
  const image = optStr(form, "imageUrl");
  const source = optStr(form, "sourceUrl");
  const data = {
    brand: str(form, "brand"),
    name: str(form, "name"),
    notes: slugList(str(form, "notes")).filter((x) => noteSlugs.has(x)).join(","),
    otherNotes: str(form, "otherNotes"),
    accords: slugList(str(form, "accords")).filter((x) => isFamily(x)).join(","),
    imageUrl: image && /^https:\/\//.test(image) ? image : null,
    imageRightsConfirmed: bool(form, "imageRightsConfirmed"),
    sourceUrl: source && /^https:\/\//.test(source) ? source : null,
    verified: bool(form, "verified"),
    active: bool(form, "active"),
  };
  if (!data.brand || !data.name) redirect("/admin/niche");
  if (id) await db.update(s.nicheFragrances).set(data).where(eq(s.nicheFragrances.id, id));
  else await db.insert(s.nicheFragrances).values(data);
  revalidateAll();
  redirect("/admin/niche?saved=1");
}

export async function deleteNiche(form: FormData) {
  await assertAdmin();
  await db.delete(s.nicheFragrances).where(eq(s.nicheFragrances.id, str(form, "id")));
  revalidateAll();
  redirect("/admin/niche");
}

// ───────── AMAVI collection ─────────
const collectionItem = z.object({ slug: z.string(), parts: z.number().int().min(1).max(100), tier: z.enum(TIERS) });

export async function saveCollection(form: FormData) {
  await assertAdmin();
  const id = optStr(form, "id");
  // One line per note: slug parts tier  (e.g. "bergamot 3 TOP")
  const items = str(form, "items")
    .split("\n")
    .map((l) => l.trim().split(/[\s,;:]+/))
    .filter((p) => p.length >= 3)
    .map(([slug, parts, tier]) => collectionItem.safeParse({ slug, parts: Number(parts), tier: tier.toUpperCase() }))
    .filter((r) => r.success)
    .map((r) => r.data!);
  const data = {
    name: str(form, "name"),
    descRu: optStr(form, "descRu"),
    descKk: optStr(form, "descKk"),
    descEn: optStr(form, "descEn"),
    itemsJson: JSON.stringify(items),
    concentrationPct: Math.round(num(form, "concentrationPct") ?? 15),
    eventSlug: optStr(form, "eventSlug"),
    active: bool(form, "active"),
    sortOrder: Math.round(num(form, "sortOrder") ?? 0),
  };
  if (!data.name || items.length === 0) redirect("/admin/collection?error=1");
  if (id) await db.update(s.collection).set(data).where(eq(s.collection.id, id));
  else await db.insert(s.collection).values(data);
  revalidateAll();
  redirect("/admin/collection?saved=1");
}

export async function deleteCollection(form: FormData) {
  await assertAdmin();
  await db.delete(s.collection).where(eq(s.collection.id, str(form, "id")));
  revalidateAll();
  redirect("/admin/collection");
}

// ───────── Users ─────────
export async function setUserRole(form: FormData) {
  const me = await assertAdmin();
  const id = str(form, "id");
  const role = str(form, "role") === "ADMIN" ? "ADMIN" : "USER";
  if (id === me.id && role !== "ADMIN") redirect("/admin/users"); // cannot demote yourself
  await db.update(s.users).set({ role }).where(and(eq(s.users.id, id)));
  redirect("/admin/users?saved=1");
}
