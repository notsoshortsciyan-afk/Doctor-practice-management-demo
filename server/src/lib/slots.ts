// Canonical appointment slot system — MUST stay identical to the public website's
// slot list so "booked vs. free" is computed against the same labels both apps show.
// The slot strings are the authoritative identifiers; they are stored verbatim in
// appointments.appointment_time (a TEXT column), e.g. "04:30 PM".

export const SLOTS = [
  "03:00 PM",
  "03:45 PM",
  "04:30 PM",
  "05:15 PM",
  "06:00 PM",
  "06:45 PM",
  "07:30 PM",
  "08:15 PM",
  "09:00 PM",
  "09:45 PM",
] as const;

export type Slot = (typeof SLOTS)[number];

// Position of each slot, used to order appointments chronologically (the TEXT
// time label can't be sorted lexically — "09:45 PM" < "3:00 PM" alphabetically).
export const slotIndex = new Map<string, number>(SLOTS.map((s, i) => [s, i]));

export function isValidSlot(s: string): boolean {
  return slotIndex.has(s);
}

// 10 fixed slots/day is the clinic's chair capacity for utilization stats.
export const DAILY_CAPACITY = SLOTS.length;

// The clinic runs on Asia/Dhaka (UTC+6). Servers (Vercel) run in UTC, so derive
// "today" in the clinic's zone to avoid an off-by-one near midnight. en-CA renders
// as YYYY-MM-DD.
export function clinicToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(s: string): boolean {
  return YMD.test(s);
}

// appointment_date is a pure DATE. Prisma reads/writes @db.Date at UTC midnight,
// so build the calendar day as UTC midnight for equality filters and inserts.
export function dateOnlyUTC(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}
