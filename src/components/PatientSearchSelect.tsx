import { useState } from "react";
import { IconSearch, IconX } from "../icons";
import { usePatients } from "../api/hooks";

export interface PickedPatient {
  id: string;
  name: string;
  code: string;
  phone: string;
}

interface Props {
  value: PickedPatient | null;
  onChange: (p: PickedPatient | null) => void;
  placeholder?: string;
}

export function PatientSearchSelect({ value, onChange, placeholder }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = usePatients({ q, pageSize: 6 });
  const results = q.length > 1 ? data?.items ?? [] : [];

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid var(--border-soft)", borderRadius: 8, padding: "8px 12px", background: "var(--bg-soft)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{value.name}</span>
          <span style={{ color: "var(--ink-500)", fontSize: 12, marginLeft: 8 }}>{value.code} · {value.phone}</span>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0 }} onClick={() => onChange(null)}>
          <IconX size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="menu-anchor">
      <div className="input-with-icon">
        <IconSearch size={16} />
        <input
          className="input"
          placeholder={placeholder ?? "Search patient by name / ID / phone…"}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
          <div className="menu" style={{ left: 0, right: 0 }}>
            {results.map((p) => (
              <div
                key={p.id}
                className="menu-item"
                onClick={() => {
                  onChange({ id: p.id, name: p.name, code: p.code, phone: p.phone });
                  setQ("");
                  setOpen(false);
                }}
              >
                <strong style={{ color: "var(--navy-900)" }}>{p.name}</strong>&nbsp;
                <span style={{ color: "var(--ink-500)", fontSize: 12 }}>{p.code} · {p.phone}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
