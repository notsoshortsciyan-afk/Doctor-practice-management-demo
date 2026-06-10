// Date-range helpers for the dashboard period filter. Pure local-date math (no deps).
// `ymd` is the canonical local YYYY-MM-DD formatter shared across screens.

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type RangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "last30"
  | "thisYear"
  | "lastYear"
  | "allTime";

export interface RangeValue {
  preset: RangePreset | "custom";
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

// Menu order, as requested by the owner.
export const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisYear", label: "This year" },
  { key: "lastYear", label: "Last year" },
  { key: "allTime", label: "All time" },
];

const PRESET_LABEL = new Map<RangePreset, string>(PRESETS.map((p) => [p.key, p.label]));

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

// Start of the week containing `d`. Sunday-start to match the clinic's locale (Asia/Dhaka).
function weekStart(d: Date): Date {
  return addDays(d, -d.getDay());
}

export function presetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (preset) {
    case "today":
      return { from: ymd(today), to: ymd(today) };
    case "yesterday": {
      const yest = addDays(today, -1);
      return { from: ymd(yest), to: ymd(yest) };
    }
    case "thisWeek":
      return { from: ymd(weekStart(today)), to: ymd(today) };
    case "lastWeek": {
      const start = addDays(weekStart(today), -7);
      return { from: ymd(start), to: ymd(addDays(start, 6)) };
    }
    case "thisMonth":
      return { from: ymd(new Date(y, m, 1)), to: ymd(today) };
    case "lastMonth":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "last30":
      return { from: ymd(addDays(today, -29)), to: ymd(today) };
    case "thisYear":
      return { from: ymd(new Date(y, 0, 1)), to: ymd(today) };
    case "lastYear":
      return { from: ymd(new Date(y - 1, 0, 1)), to: ymd(new Date(y - 1, 11, 31)) };
    case "allTime":
      return { from: "2000-01-01", to: ymd(today) };
  }
}

// A single calendar month → inclusive day range.
export function monthRange(year: number, monthIdx: number): { from: string; to: string } {
  return { from: ymd(new Date(year, monthIdx, 1)), to: ymd(new Date(year, monthIdx + 1, 0)) };
}

// Span across two (possibly equal) months in a year, order-independent.
export function monthSpan(year: number, a: number, b: number): { from: string; to: string } {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return { from: ymd(new Date(year, lo, 1)), to: ymd(new Date(year, hi + 1, 0)) };
}

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parse a YYYY-MM-DD string into local Date parts (avoids UTC offset surprises).
function parseYmd(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
}

function fmtDay(s: string, withYear: boolean): string {
  const { y, m, d } = parseYmd(s);
  return withYear ? `${d} ${MONTHS_SHORT[m]} ${y}` : `${d} ${MONTHS_SHORT[m]}`;
}

// Trigger text: the preset label, or a compact custom range like "1 Jun – 11 Jun 2026".
export function rangeLabel(value: RangeValue): string {
  if (value.preset !== "custom") return PRESET_LABEL.get(value.preset) ?? "Select…";
  if (value.from === value.to) return fmtDay(value.from, true);
  const sameYear = value.from.slice(0, 4) === value.to.slice(0, 4);
  return `${fmtDay(value.from, !sameYear)} – ${fmtDay(value.to, true)}`;
}

// Sub-text under a period card, e.g. "This month" or the custom range label.
export function rangeSubLabel(value: RangeValue): string {
  return value.preset !== "custom" ? (PRESET_LABEL.get(value.preset) ?? "") : rangeLabel(value);
}
