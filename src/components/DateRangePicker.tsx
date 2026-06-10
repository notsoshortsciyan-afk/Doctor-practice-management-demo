import { useEffect, useRef, useState } from "react";
import { IconCalendar, IconChev, IconChevL, IconChevR, IconCheck } from "../icons";
import {
  PRESETS,
  presetRange,
  monthRange,
  monthSpan,
  rangeLabel,
  MONTHS_SHORT,
  type RangePreset,
  type RangeValue,
} from "../lib/dateRange";

interface DateRangePickerProps {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}

/**
 * Dashboard period selector: a list of presets (today / this week / last month /
 * this year / …) plus a "Custom range" panel with a year-stepped 12-month grid
 * (click one month = that month; click a second = a span) and exact from/to date
 * inputs. Re-uses the `.dd-item` look from Dropdown for the preset rows.
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Custom-panel working state (committed only on "Apply").
  const [year, setYear] = useState(() => Number(value.from.slice(0, 4)) || new Date().getFullYear());
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [anchor, setAnchor] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openMenu() {
    setView("presets");
    setYear(Number(value.from.slice(0, 4)) || new Date().getFullYear());
    setFrom(value.from);
    setTo(value.to);
    setAnchor(null);
    setOpen(true);
  }

  function pickPreset(key: RangePreset) {
    onChange({ preset: key, ...presetRange(key) });
    setOpen(false);
  }

  function clickMonth(idx: number) {
    const r = anchor === null ? monthRange(year, idx) : monthSpan(year, anchor, idx);
    setFrom(r.from);
    setTo(r.to);
    setAnchor(anchor === null ? idx : null);
  }

  // Highlight every month of `year` covered by the current from/to selection.
  function monthActive(idx: number): boolean {
    const mStart = monthRange(year, idx).from;
    const mEnd = monthRange(year, idx).to;
    return from <= mEnd && to >= mStart;
  }

  function applyCustom() {
    if (!from || !to) return;
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    onChange({ preset: "custom", from: lo, to: hi });
    setOpen(false);
  }

  return (
    <div className="drp" ref={wrapRef}>
      <button type="button" className="drp-trigger" onClick={() => (open ? setOpen(false) : openMenu())}>
        <IconCalendar size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
        <span className="drp-label">{rangeLabel(value)}</span>
        <IconChev size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
      </button>

      {open && (
        <div className="drp-menu">
          {view === "presets" ? (
            <>
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  className={`dd-item${value.preset === p.key ? " dd-item-active" : ""}`}
                  onClick={() => pickPreset(p.key)}
                >
                  <span>{p.label}</span>
                  {value.preset === p.key && <IconCheck size={15} />}
                </button>
              ))}
              <button
                type="button"
                className={`dd-item dd-item-custom${value.preset === "custom" ? " dd-item-active" : ""}`}
                onClick={() => setView("custom")}
              >
                <span>{value.preset === "custom" ? `Custom: ${rangeLabel(value)}` : "Custom range…"}</span>
                <IconChev size={14} style={{ transform: "rotate(-90deg)", opacity: 0.6 }} />
              </button>
            </>
          ) : (
            <div className="drp-custom">
              <div className="drp-year">
                <button type="button" className="drp-step" onClick={() => { setYear((y) => y - 1); setAnchor(null); }} aria-label="Previous year">
                  <IconChevL size={16} />
                </button>
                <span className="drp-year-label">{year}</span>
                <button type="button" className="drp-step" onClick={() => { setYear((y) => y + 1); setAnchor(null); }} aria-label="Next year">
                  <IconChevR size={16} />
                </button>
              </div>

              <div className="drp-months">
                {MONTHS_SHORT.map((m, idx) => (
                  <button
                    type="button"
                    key={m}
                    className={`drp-month${monthActive(idx) ? " drp-month-active" : ""}`}
                    onClick={() => clickMonth(idx)}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="drp-dates">
                <label className="drp-field">
                  <span>From</span>
                  <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setAnchor(null); }} />
                </label>
                <label className="drp-field">
                  <span>To</span>
                  <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setAnchor(null); }} />
                </label>
              </div>

              <div className="drp-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView("presets")}>Back</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={applyCustom} disabled={!from || !to}>Apply</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
