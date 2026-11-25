// Booking slots. Pure functions (no DB) so they can be unit-tested and used on client and server.
// All studio times are Almaty time: Kazakhstan uses UTC+5 all year (single time zone since 2024).

export const ALMATY_OFFSET_MIN = 5 * 60;

export type SlotSettings = {
  slotMinutes: number;
  opensAt: string; // "HH:MM"
  closesAt: string; // "HH:MM"
  horizonDays: number;
  minLeadHours: number;
  depositPct: number;
};

export type PerfumerSchedule = {
  id: string;
  workDays: string; // "1,2,3" ISO weekdays
  startTime: string;
  endTime: string;
  daysOff: string; // "2026-12-31,2027-01-01"
};

export type SlotState = "free" | "booked" | "past" | "off";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** "YYYY-MM-DD" (Almaty) + minutes after midnight → UTC epoch ms. */
export function almatyToUtc(day: string, minutes: number): number {
  const [y, mo, d] = day.split("-").map(Number);
  return Date.UTC(y, mo - 1, d, 0, minutes) - ALMATY_OFFSET_MIN * 60_000;
}

/** UTC epoch ms → { day: "YYYY-MM-DD", minutes } in Almaty time. */
export function utcToAlmaty(ms: number): { day: string; minutes: number; isoWeekday: number } {
  const local = new Date(ms + ALMATY_OFFSET_MIN * 60_000);
  const day = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const wd = local.getUTCDay();
  return { day, minutes: local.getUTCHours() * 60 + local.getUTCMinutes(), isoWeekday: wd === 0 ? 7 : wd };
}

/** The next `count` studio days (Almaty), starting today. */
export function upcomingDays(nowMs: number, count: number): string[] {
  const { day } = utcToAlmaty(nowMs);
  const start = almatyToUtc(day, 12 * 60); // midday avoids edge cases
  return Array.from({ length: count }, (_, i) => utcToAlmaty(start + i * 86_400_000).day);
}

/** Start times (minutes after midnight) of all slots in the studio's opening hours. */
export function slotStarts(cfg: Pick<SlotSettings, "slotMinutes" | "opensAt" | "closesAt">): number[] {
  const out: number[] = [];
  const open = toMin(cfg.opensAt);
  const close = toMin(cfg.closesAt);
  for (let t = open; t + cfg.slotMinutes <= close; t += cfg.slotMinutes) out.push(t);
  return out;
}

/** State of one perfumer's slot. `bookedStarts` = UTC ms of active bookings for that perfumer. */
export function slotState(
  p: PerfumerSchedule,
  day: string,
  startMin: number,
  cfg: Pick<SlotSettings, "slotMinutes" | "minLeadHours">,
  bookedStarts: Set<number>,
  nowMs: number,
): SlotState {
  const utc = almatyToUtc(day, startMin);
  const { isoWeekday } = utcToAlmaty(utc);
  const works = p.workDays.split(",").map((x) => Number(x.trim())).includes(isoWeekday);
  const off = p.daysOff.split(",").map((x) => x.trim()).includes(day);
  const inShift = startMin >= toMin(p.startTime) && startMin + cfg.slotMinutes <= toMin(p.endTime);
  if (!works || off || !inShift) return "off";
  if (utc < nowMs + cfg.minLeadHours * 3_600_000) return "past";
  if (bookedStarts.has(utc)) return "booked";
  return "free";
}

export function depositFor(priceKzt: number, depositPct: number) {
  return Math.round((priceKzt * depositPct) / 100);
}

export const BOOKING_STATUSES = ["PENDING_DEPOSIT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
