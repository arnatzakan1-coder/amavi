// Business facts shared by the seed (new databases) and the one-time data update (live database).
// Sources: AMAVI presentation (Canva "AMAVI_CR_loop-2", Nov 2026) and the IP financial model (20.11.2026).

export const PRICES = [
  { ml: 10, priceKzt: 24000 },
  { ml: 30, priceKzt: 45000 },
];

/** Perfume concentrate share — 20% (IP model: "concentrate 20%"). */
export const CONCENTRATION_PCT = 20;

export const BOUTIQUE = {
  addressRu: "ул. Желтоксан, 155, Алмалинский район, Алматы",
  addressKk: "Желтоқсан к-сі, 155, Алмалы ауданы, Алматы",
  addressEn: "155 Zheltoqsan St., Almaly District, Almaty",
  areaM2: null,
  // Exact coordinates are not in the files → set them in Admin → Boutique for the map pin.
  lat: null,
  lon: null,
  twoGisUrl: "https://2gis.kz/almaty/search/" + encodeURIComponent("Желтоксан 155"),
  hours: "10:00–21:00",
  phone: "+77765518509",
  whatsapp: "77765518509",
  listingUrl: null,
  leaseSigned: false,
};

/** Consultation booking. New-client session = 82.5 min (deck, key activities) → 90-minute slots. */
export const BOOKING = {
  slotMinutes: 90,
  opensAt: "10:00",
  closesAt: "21:00",
  horizonDays: 14,
  minLeadHours: 2,
  depositPct: 50,
};

/** Three perfumer-consultants (deck: "3 perfume-consultants"). Real names are not in the
 *  materials → placeholders, flagged in the admin panel until the team renames them. */
export const PERFUMERS = [
  { name: "Парфюмер 1", sortOrder: 0 },
  { name: "Парфюмер 2", sortOrder: 1 },
  { name: "Парфюмер 3", sortOrder: 2 },
];
