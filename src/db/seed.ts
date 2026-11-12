/**
 * AMAVI seed.
 * Sources:
 *  - notes-source.json  ← finmodel sheet T2_Notes (30 notes, family, supplier, material, safety note)
 *  - prices             ← AMAVI_Step1_corrected.docx §1.2 / §4.1 (10 ml 9,900 ₸, 30 ml 21,900 ₸, gift set 26,900 ₸)
 *  - concentrations     ← finmodel Assumptions "conc": allowed 15 / 20 / 25 %, standard 20 %
 *  - courier Almaty     ← finmodel Assumptions "deliv": 1,500 ₸ (estimate)
 *  - boutique address   ← docx §4.1: Radostovets St. 165/1, Bostandyk District, Almaty, 50 m²
 * Everything not present in the files is seeded as an editable DRAFT and flagged in the admin panel.
 */
import { eq } from "drizzle-orm";
import notesSource from "./data/notes-source.json";
import { db, schema as s } from "./index";

// Translated note names (EN name is from the file).
const NAMES: Record<string, { ru: string; kk: string }> = {
  bergamot: { ru: "Бергамот", kk: "Бергамот" },
  lemon: { ru: "Лимон", kk: "Лимон" },
  mandarin: { ru: "Мандарин", kk: "Мандарин" },
  grapefruit: { ru: "Грейпфрут", kk: "Грейпфрут" },
  lavender: { ru: "Лаванда", kk: "Лаванда" },
  "green-tea": { ru: "Зелёный чай", kk: "Жасыл шай" },
  rose: { ru: "Роза", kk: "Раушан" },
  jasmine: { ru: "Жасмин", kk: "Жасмин" },
  "orange-blossom": { ru: "Цветок апельсина (нероли)", kk: "Апельсин гүлі (нероли)" },
  peony: { ru: "Пион", kk: "Пион" },
  "ylang-ylang": { ru: "Иланг-иланг", kk: "Иланг-иланг" },
  hedione: { ru: "Гедион", kk: "Гедион" },
  cedarwood: { ru: "Кедр", kk: "Самырсын" },
  sandalwood: { ru: "Сандал", kk: "Сандал ағашы" },
  vetiver: { ru: "Ветивер", kk: "Ветивер" },
  patchouli: { ru: "Пачули", kk: "Пачули" },
  "white-musk": { ru: "Белый мускус", kk: "Ақ мускус" },
  ambroxan: { ru: "Амброксан", kk: "Амброксан" },
  amber: { ru: "Амбра", kk: "Амбра" },
  labdanum: { ru: "Лабданум", kk: "Лабданум" },
  "tonka-bean": { ru: "Бобы тонка", kk: "Тонка бұршағы" },
  vanilla: { ru: "Ваниль", kk: "Ваниль" },
  saffron: { ru: "Шафран", kk: "Запыран" },
  cardamom: { ru: "Кардамон", kk: "Кардамон" },
  "pink-pepper": { ru: "Розовый перец", kk: "Қызғылт бұрыш" },
  caramel: { ru: "Карамель", kk: "Карамель" },
  coffee: { ru: "Кофе", kk: "Кофе" },
  almond: { ru: "Миндаль", kk: "Бадам" },
  cocoa: { ru: "Какао", kk: "Какао" },
  "ethyl-maltol": { ru: "Этилмальтол", kk: "Этилмальтол" },
};

// DRAFT pyramid placement following common perfumery convention.
// Not in the source files → tierVerified = false until the perfumer confirms.
const DRAFT_TIER: Record<string, "TOP" | "HEART" | "BASE"> = {
  bergamot: "TOP", lemon: "TOP", mandarin: "TOP", grapefruit: "TOP",
  "green-tea": "TOP", "pink-pepper": "TOP", cardamom: "TOP",
  lavender: "HEART", rose: "HEART", jasmine: "HEART", "orange-blossom": "HEART",
  peony: "HEART", "ylang-ylang": "HEART", hedione: "HEART", saffron: "HEART",
  almond: "HEART", coffee: "HEART",
  cedarwood: "BASE", sandalwood: "BASE", vetiver: "BASE", patchouli: "BASE",
  "white-musk": "BASE", ambroxan: "BASE", amber: "BASE", labdanum: "BASE",
  "tonka-bean": "BASE", vanilla: "BASE", caramel: "BASE", cocoa: "BASE",
  "ethyl-maltol": "BASE",
};

const EVENTS = [
  // List from the brief; recommended families are a DRAFT the admin can edit.
  // Day vs evening logic follows docx Problem/Solution 2: "a fresh scent for the day, a deep one for the evening".
  { slug: "everyday", ru: "На каждый день", kk: "Күнделікті", en: "Everyday", fam: "CITRUS,FRESH,MUSKY" },
  { slug: "evening", ru: "Вечерний выход", kk: "Кешкі шығу", en: "Evening out", fam: "ORIENTAL,WOODY,SPICY" },
  { slug: "date", ru: "Свидание", kk: "Кездесу", en: "Date", fam: "FLORAL,ORIENTAL,GOURMAND" },
  { slug: "office", ru: "Работа и офис", kk: "Жұмыс және кеңсе", en: "Work & office", fam: "FRESH,CITRUS,WOODY" },
  { slug: "special", ru: "Особое мероприятие", kk: "Ерекше іс-шара", en: "Special event", fam: "FLORAL,ORIENTAL,WOODY" },
  { slug: "celebration", ru: "Праздник", kk: "Мереке", en: "Celebration", fam: "FLORAL,GOURMAND,SPICY" },
  { slug: "summer", ru: "Лето", kk: "Жаз", en: "Summer", fam: "CITRUS,FRESH,FLORAL" },
  { slug: "winter", ru: "Зима", kk: "Қыс", en: "Winter", fam: "ORIENTAL,GOURMAND,WOODY" },
  { slug: "gift", ru: "Подарок", kk: "Сыйлық", en: "Gift", fam: "" },
  { slug: "universal", ru: "Универсальный аромат", kk: "Әмбебап хош иіс", en: "Universal", fam: "" },
];

// Niche catalogue. `notes` = AMAVI slugs that appear in each fragrance's PUBLIC note list.
// verified=false → must be checked against the brand page before launch. No images (rights not confirmed).
const NICHE = [
  { brand: "Le Labo", name: "Santal 33", notes: "sandalwood,cardamom,cedarwood,ambroxan", other: "iris, violet, papyrus, leather", acc: "WOODY,SPICY" },
  { brand: "Le Labo", name: "Another 13", notes: "ambroxan,white-musk,jasmine", other: "moss, pear", acc: "MUSKY" },
  { brand: "Le Labo", name: "Rose 31", notes: "rose,cedarwood,vetiver,labdanum,amber,white-musk", other: "cumin, guaiac wood, oud", acc: "FLORAL,WOODY,SPICY" },
  { brand: "Maison Francis Kurkdjian", name: "Baccarat Rouge 540", notes: "saffron,jasmine,cedarwood,ambroxan", other: "amberwood, fir resin", acc: "ORIENTAL,WOODY,FLORAL" },
  { brand: "Maison Francis Kurkdjian", name: "Grand Soir", notes: "labdanum,amber,tonka-bean,vanilla", other: "benzoin", acc: "ORIENTAL" },
  { brand: "Byredo", name: "Gypsy Water", notes: "bergamot,lemon,amber,vanilla,sandalwood", other: "pepper, juniper, incense, pine needles, orris", acc: "WOODY,CITRUS" },
  { brand: "Byredo", name: "Bal d'Afrique", notes: "bergamot,lemon,orange-blossom,jasmine,vetiver,white-musk,amber,cedarwood", other: "marigold, buchu, violet, cyclamen", acc: "CITRUS,FLORAL,WOODY" },
  { brand: "Byredo", name: "Mojave Ghost", notes: "sandalwood,cedarwood,amber", other: "ambrette, sapodilla, magnolia, violet", acc: "WOODY,FLORAL,MUSKY" },
  { brand: "Xerjoff", name: "Naxos", notes: "lavender,bergamot,lemon,jasmine,tonka-bean,vanilla", other: "honey, cinnamon, cashmeran, tobacco", acc: "FRESH,GOURMAND,ORIENTAL" },
  { brand: "Xerjoff", name: "Erba Pura", notes: "bergamot,lemon,white-musk,vanilla,amber", other: "orange, fruits", acc: "CITRUS,MUSKY,GOURMAND" },
  { brand: "Amouage", name: "Interlude Man", notes: "bergamot,amber,labdanum,sandalwood,patchouli", other: "oregano, pimento, incense, opoponax, leather, oud", acc: "ORIENTAL,SPICY,WOODY" },
  { brand: "Amouage", name: "Reflection Man", notes: "pink-pepper,jasmine,orange-blossom,sandalwood,cedarwood,vetiver,patchouli", other: "rosemary, petitgrain, orris", acc: "FLORAL,WOODY,FRESH" },
  { brand: "Kilian", name: "Love, Don't Be Shy", notes: "orange-blossom,bergamot,pink-pepper,jasmine,rose,vanilla,caramel,white-musk,labdanum", other: "coriander, honeysuckle, iris, sugar", acc: "GOURMAND,FLORAL" },
  { brand: "Tom Ford", name: "Tobacco Vanille", notes: "vanilla,cocoa,tonka-bean", other: "tobacco leaf, spices, dried fruits, woods", acc: "GOURMAND,ORIENTAL,SPICY" },
];

const SETTINGS: Record<string, unknown> = {
  rules: {
    // DRAFT composition rules — the perfumer must confirm them (verified=false).
    maxNotes: 10,
    minNotesPerTier: 1,
    verified: false,
  },
  giftSet: {
    // docx §4.1: gift set of three 10 ml perfumes — 26,900 ₸ (vs 29,700 ₸ separately).
    enabled: true,
    bottles: 3,
    volumeMl: 10,
    priceKzt: 26900,
  },
  boutique: {
    addressRu: "ул. Радостовца, 165/1, Бостандыкский район, Алматы",
    addressKk: "Радостовец к-сі, 165/1, Бостандық ауданы, Алматы",
    addressEn: "165/1 Radostovets St., Bostandyk District, Almaty",
    areaM2: 50,
    // Coordinates and the exact 2GIS card are not in the files → fill in the admin panel.
    lat: null,
    lon: null,
    twoGisUrl: "https://2gis.kz/almaty/search/" + encodeURIComponent("Радостовца 165/1"),
    hours: null,
    phone: "+77751234567",
    whatsapp: "77751234567",
    listingUrl: "https://krisha.kz/a/show/1016465325",
    leaseSigned: false,
  },
};

async function upsertSetting(key: string, value: unknown) {
  const existing = await db.select().from(s.settings).where(eq(s.settings.key, key));
  if (existing.length === 0) await db.insert(s.settings).values({ key, value: JSON.stringify(value) });
}

export async function runSeed() {
  for (const n of notesSource as Array<Record<string, string | number>>) {
    const slug = String(n.slug);
    const names = NAMES[slug];
    if (!names) throw new Error(`Missing translation for ${slug}`);
    const data = {
      position: Number(n.position),
      nameRu: names.ru,
      nameKk: names.kk,
      nameEn: String(n.nameEn),
      family: String(n.family),
      material: String(n.material),
      supplier: String(n.supplier),
      safetyNote: String(n.safetyNote),
      documents: String(n.documents),
    };
    // Source-file fields are refreshed on every seed; perfumer-edited fields are kept.
    await db
      .insert(s.notes)
      .values({ slug, ...data, tier: DRAFT_TIER[slug], tierVerified: false })
      .onConflictDoUpdate({ target: s.notes.slug, set: data });
  }

  for (const [i, e] of EVENTS.entries()) {
    await db
      .insert(s.eventCategories)
      .values({ slug: e.slug, nameRu: e.ru, nameKk: e.kk, nameEn: e.en, recommendedFamilies: e.fam, sortOrder: i })
      .onConflictDoNothing();
  }

  await db.insert(s.volumes).values([
    { ml: 10, priceKzt: 9900, sortOrder: 0 },
    { ml: 30, priceKzt: 21900, sortOrder: 1 },
  ]).onConflictDoNothing();

  await db.insert(s.concentrations).values(
    [15, 20, 25].map((pct) => ({ pct, isDefault: pct === 20, surchargeKzt: 0 })),
  ).onConflictDoNothing();

  const delivery = [
    { code: "pickup", ru: "Самовывоз из бутика", kk: "Бутиктен алып кету", en: "Pick up at the boutique", price: 0, addr: false },
    { code: "courier_almaty", ru: "Курьер по Алматы", kk: "Алматы бойынша курьер", en: "Courier in Almaty", price: 1500, addr: true },
    // Price for other cities is not in the files → null = hidden until the admin sets it.
    { code: "kz_cities", ru: "Доставка по Казахстану (Астана и др.)", kk: "Қазақстан бойынша жеткізу (Астана, т.б.)", en: "Delivery across Kazakhstan (Astana etc.)", price: null, addr: true },
  ];
  await db.insert(s.deliveryMethods).values(
    delivery.map((d, i) => ({ code: d.code, nameRu: d.ru, nameKk: d.kk, nameEn: d.en, priceKzt: d.price, requiresAddress: d.addr, sortOrder: i })),
  ).onConflictDoNothing();

  const payments = [
    { code: "kaspi", ru: "Kaspi", kk: "Kaspi", en: "Kaspi" },
    { code: "halyk", ru: "Halyk", kk: "Halyk", en: "Halyk" },
    { code: "card", ru: "Банковская карта Visa / Mastercard", kk: "Visa / Mastercard банк картасы", en: "Visa / Mastercard card" },
    // Manual: a manager sends a Kaspi Pay invoice to the customer's phone after confirming the order.
    { code: "kaspi_invoice", ru: "Kaspi: счёт на номер телефона", kk: "Kaspi: телефон нөміріне шот", en: "Kaspi: invoice to your phone" },
    { code: "boutique", ru: "Оплата в бутике при получении", kk: "Бутикте алған кезде төлеу", en: "Pay at the boutique on pickup" },
  ];
  await db.insert(s.paymentMethods).values(
    payments.map((p, i) => ({ code: p.code, nameRu: p.ru, nameKk: p.kk, nameEn: p.en, sortOrder: i })),
  ).onConflictDoNothing();

  for (const [key, value] of Object.entries(SETTINGS)) await upsertSetting(key, value);

  const niche = await db.select().from(s.nicheFragrances).limit(1);
  if (niche.length === 0) {
    await db.insert(s.nicheFragrances).values(
      NICHE.map((f) => ({ brand: f.brand, name: f.name, notes: f.notes, otherNotes: f.other, accords: f.acc, verified: false })),
    );
  }

  const count = await db.select().from(s.notes);
  return count.length;
}
