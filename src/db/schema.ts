// AMAVI data model (Drizzle ORM, SQLite / libSQL).
// Local: file:./data/amavi.db · Production: Turso (libSQL) — see README.
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdateFn(() => new Date());

// ───────────── Auth (Auth.js tables + role/password) ─────────────

export const users = sqliteTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["USER", "PERFUMER", "ADMIN"] }).notNull().default("USER"),
  phone: text("phone"),
  locale: text("locale").notNull().default("ru"),
  createdAt: createdAt(),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ───────────── Perfume data ─────────────

/** One of the 30 AMAVI notes. Name, family, material, supplier, documents and safety
 *  note come from the financial model (T2_Notes). Fields with a *Verified flag are
 *  drafts until the perfumer confirms them in the admin panel. */
export const notes = sqliteTable("note", {
  id: id(),
  slug: text("slug").notNull().unique(),
  position: integer("position").notNull().default(0),
  nameRu: text("name_ru").notNull(),
  nameKk: text("name_kk").notNull(),
  nameEn: text("name_en").notNull(),
  family: text("family").notNull(),
  material: text("material").notNull(),
  supplier: text("supplier"),
  safetyNote: text("safety_note"),
  documents: text("documents"),
  descRu: text("desc_ru"),
  descKk: text("desc_kk"),
  descEn: text("desc_en"),
  tier: text("tier"), // TOP | HEART | BASE
  tierVerified: integer("tier_verified", { mode: "boolean" }).notNull().default(false),
  intensity: integer("intensity"), // 1..5
  isFixed: integer("is_fixed", { mode: "boolean" }).notNull().default(false),
  fixedParts: integer("fixed_parts"),
  minParts: integer("min_parts").notNull().default(1),
  maxParts: integer("max_parts").notNull().default(10),
  maxSharePct: real("max_share_pct"),
  perfumerVerified: integer("perfumer_verified", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: updatedAt(),
});

export const incompatiblePairs = sqliteTable(
  "incompatible_pair",
  {
    id: id(),
    noteA: text("note_a").notNull(),
    noteB: text("note_b").notNull(),
    reason: text("reason"),
  },
  (t) => [uniqueIndex("pair_uq").on(t.noteA, t.noteB)],
);

export const eventCategories = sqliteTable("event_category", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameRu: text("name_ru").notNull(),
  nameKk: text("name_kk").notNull(),
  nameEn: text("name_en").notNull(),
  recommendedFamilies: text("recommended_families").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

/** Admin-editable settings stored as JSON (rules, giftSet, boutique). */
export const settings = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export const volumes = sqliteTable("volume", {
  id: id(),
  ml: integer("ml").notNull().unique(),
  priceKzt: integer("price_kzt").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const concentrations = sqliteTable("concentration", {
  id: id(),
  pct: integer("pct").notNull().unique(),
  surchargeKzt: integer("surcharge_kzt").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const deliveryMethods = sqliteTable("delivery_method", {
  id: id(),
  code: text("code").notNull().unique(),
  nameRu: text("name_ru").notNull(),
  nameKk: text("name_kk").notNull(),
  nameEn: text("name_en").notNull(),
  priceKzt: integer("price_kzt"), // null → not configured, hidden at checkout
  requiresAddress: integer("requires_address", { mode: "boolean" }).notNull().default(true),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const paymentMethods = sqliteTable("payment_method", {
  id: id(),
  code: text("code").notNull().unique(), // kaspi | halyk | card | boutique
  nameRu: text("name_ru").notNull(),
  nameKk: text("name_kk").notNull(),
  nameEn: text("name_en").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ───────────── Customer data ─────────────

export const formulas = sqliteTable(
  "formula",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    eventSlug: text("event_slug"),
    // Formulas are AMAVI's IP: created by a perfumer in the studio, never shown to the customer.
    createdById: text("created_by_id"),
    bookingId: text("booking_id"),
    concentrationPct: integer("concentration_pct").notNull().default(20),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("formula_user_idx").on(t.userId)],
);

export const formulaItems = sqliteTable("formula_item", {
  id: id(),
  formulaId: text("formula_id")
    .notNull()
    .references(() => formulas.id, { onDelete: "cascade" }),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id),
  parts: integer("parts").notNull(),
  tier: text("tier").notNull(),
});

export const addresses = sqliteTable(
  "address",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    street: text("street").notNull(),
    house: text("house").notNull(),
    apartment: text("apartment"),
    comment: text("comment"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("address_user_idx").on(t.userId)],
);

export const orders = sqliteTable(
  "order",
  {
    id: id(),
    number: text("number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("PENDING_PAYMENT"),
    deliveryCode: text("delivery_code").notNull(),
    paymentCode: text("payment_code").notNull(),
    addressJson: text("address_json"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    subtotalKzt: integer("subtotal_kzt").notNull(),
    discountKzt: integer("discount_kzt").notNull().default(0),
    deliveryFeeKzt: integer("delivery_fee_kzt").notNull(),
    totalKzt: integer("total_kzt").notNull(),
    paymentProvider: text("payment_provider"),
    paymentRef: text("payment_ref"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("order_user_idx").on(t.userId)],
);

export const orderItems = sqliteTable("order_item", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  formulaId: text("formula_id"),
  formulaName: text("formula_name").notNull(),
  formulaJson: text("formula_json").notNull(),
  volumeMl: integer("volume_ml").notNull(),
  concentrationPct: integer("concentration_pct").notNull(),
  unitPriceKzt: integer("unit_price_kzt").notNull(),
  qty: integer("qty").notNull(),
});

export const orderEvents = sqliteTable("order_event", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

export const inquiries = sqliteTable("inquiry", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  message: text("message").notNull(),
  status: text("status").notNull().default("NEW"), // NEW | IN_PROGRESS | DONE
  createdAt: createdAt(),
});

// ───────────── Catalogues ─────────────

/** Existing AMAVI fragrances (the perfumer's recommended recipes). Empty until provided. */
export const collection = sqliteTable("collection_fragrance", {
  id: id(),
  name: text("name").notNull(),
  descRu: text("desc_ru"),
  descKk: text("desc_kk"),
  descEn: text("desc_en"),
  itemsJson: text("items_json").notNull(), // [{slug, parts, tier}]
  concentrationPct: integer("concentration_pct").notNull().default(20),
  eventSlug: text("event_slug"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Niche fragrances for matching. `notes` = AMAVI slugs found in the public note list. */
export const nicheFragrances = sqliteTable("niche_fragrance", {
  id: id(),
  brand: text("brand").notNull(),
  name: text("name").notNull(),
  notes: text("notes").notNull(),
  otherNotes: text("other_notes").notNull().default(""),
  accords: text("accords").notNull().default(""),
  imageUrl: text("image_url"),
  imageRightsConfirmed: integer("image_rights_confirmed", { mode: "boolean" }).notNull().default(false),
  sourceUrl: text("source_url"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// ───────── Studio: perfumers, schedules, bookings ─────────

/** One of AMAVI's perfumer-consultants. Name and schedule are edited in the admin panel. */
export const perfumers = sqliteTable("perfumer", {
  id: id(),
  name: text("name").notNull(),
  bioRu: text("bio_ru"),
  bioKk: text("bio_kk"),
  bioEn: text("bio_en"),
  userId: text("user_id"), // staff account linked to this perfumer (sees their bookings)
  workDays: text("work_days").notNull().default("1,2,3,4,5,6,7"), // ISO weekdays, 1 = Monday
  startTime: text("start_time").notNull().default("10:00"),
  endTime: text("end_time").notNull().default("21:00"),
  daysOff: text("days_off").notNull().default(""), // comma-separated YYYY-MM-DD
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  nameVerified: integer("name_verified", { mode: "boolean" }).notNull().default(false),
});

/** A consultation booking. The partial unique index means a perfumer's time slot can be
 *  held by only one active booking; cancelling frees it. */
export const bookings = sqliteTable(
  "booking",
  {
    id: id(),
    number: text("number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    perfumerId: text("perfumer_id")
      .notNull()
      .references(() => perfumers.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    durationMin: integer("duration_min").notNull(),
    status: text("status").notNull().default("PENDING_DEPOSIT"), // PENDING_DEPOSIT | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
    volumeMl: integer("volume_ml").notNull(),
    depositKzt: integer("deposit_kzt").notNull(),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    questionnaireJson: text("questionnaire_json").notNull(),
    staffNote: text("staff_note"),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("booking_slot_uq").on(t.perfumerId, t.startsAt).where(sql`status <> 'CANCELLED'`),
    index("booking_user_idx").on(t.userId),
  ],
);

export type Note = typeof notes.$inferSelect;
export type Perfumer = typeof perfumers.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type EventCategory = typeof eventCategories.$inferSelect;
export type Volume = typeof volumes.$inferSelect;
export type Concentration = typeof concentrations.$inferSelect;
export type DeliveryMethod = typeof deliveryMethods.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NicheFragrance = typeof nicheFragrances.$inferSelect;
