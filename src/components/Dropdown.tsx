import { useEffect, useRef, useState } from "react";
import { IconChev, IconCheck } from "../icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Append a "Custom…" entry that swaps the trigger into a free-text input. */
  allowCustom?: boolean;
  customLabel?: string;
}

/**
 * Lightweight styled select (button trigger + popover list). Matches the app
 * tokens via `.dd-*` classes in styles.css. With `allowCustom`, a value that
 * isn't in `options` is treated as a custom entry and can be typed inline —
 * preserving the free-text behaviour of the datalist it replaces.
 */
export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "Select…",
  allowCustom = false,
  customLabel = "Custom…",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const isCustom = !!value && !selected;

  // Close on outside click / Esc.
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

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setEditing(false);
  };

  const startCustom = () => {
    setOpen(false);
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="input dd-custom-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
      />
    );
  }

  const display = selected?.label ?? (value || placeholder);

  return (
    <div className="dd" ref={wrapRef}>
      <button
        type="button"
        className={`dd-trigger${value ? "" : " dd-placeholder"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dd-value">{display}</span>
        <IconChev size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`dd-item${o.value === value ? " dd-item-active" : ""}`}
              onClick={() => pick(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && <IconCheck size={15} />}
            </button>
          ))}
          {allowCustom && (
            <button
              type="button"
              className={`dd-item dd-item-custom${isCustom ? " dd-item-active" : ""}`}
              onClick={startCustom}
            >
              <span>{isCustom ? `Custom: ${value}` : customLabel}</span>
              {isCustom && <IconCheck size={15} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
