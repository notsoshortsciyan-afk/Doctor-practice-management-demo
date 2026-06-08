import { useMemo, useState } from "react";
import { IconFile, IconSearch } from "../icons";
import { usePrescriptions } from "../api/hooks";
import { RecordModal } from "../components/RecordModal";
import { TableRowsSkeleton } from "../components/Skeleton";
import type { ApiPrescription } from "../api/types";

export function Records({ openPatient }: { openPatient: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ApiPrescription | null>(null);
  // Fetch the archive once (stable cache key, no `q`) and search in memory so
  // typing filters instantly instead of firing a request per keystroke.
  const { data, isLoading } = usePrescriptions({ limit: 2000 });
  const all = data ?? [];
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((rx) =>
      [rx.patient.name, rx.patient.code, rx.diagnosis, rx.complaint]
        .some((f) => f?.toLowerCase().includes(term))
    );
  }, [all, q]);

  return (
    <div className="page" data-screen-label="Records">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div>
          <h1 className="h1">Records</h1>
          <div className="lede" style={{ fontSize: 16 }}>Searchable archive of issued prescriptions.</div>
        </div>
      </div>

      <div className="input-with-icon" style={{ marginTop: 28, maxWidth: 480 }}>
        <IconSearch size={18} />
        <input className="input" style={{ height: 48 }} placeholder="Search by patient, diagnosis, complaint…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="dt-head" style={{ gridTemplateColumns: "1.2fr 2fr 2.4fr 1fr 1fr" }}>
          <div className="col">Date</div>
          <div className="col">Patient</div>
          <div className="col">Diagnosis</div>
          <div className="col">Medicines</div>
          <div className="col" style={{ textAlign: "right" }}>Actions</div>
        </div>
        {isLoading ? (
          <TableRowsSkeleton rows={6} cols={5} gridTemplateColumns="1.2fr 2fr 2.4fr 1fr 1fr" />
        ) : list.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--ink-500)", background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderTop: 0, borderRadius: "0 0 10px 10px" }}>
            <IconFile size={44} style={{ color: "var(--ink-300)", margin: "0 auto" }} />
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 16, marginTop: 10 }}>No records found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Prescriptions you create will appear here.</div>
          </div>
        ) : (
          list.map((rx) => (
            <div key={rx.id} className="dt-row" style={{ gridTemplateColumns: "1.2fr 2fr 2.4fr 1fr 1fr" }} onClick={() => setSelected(rx)}>
              <div style={{ color: "var(--ink-600)", fontSize: 14 }}>{rx.date?.label}</div>
              <div>
                <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{rx.patient.name}</div>
                <div style={{ color: "var(--ink-500)", fontSize: 12 }}>{rx.patient.code}</div>
              </div>
              <div style={{ color: "var(--ink-600)", fontSize: 14 }}>{rx.diagnosis || <span style={{ color: "var(--ink-400)" }}>—</span>}</div>
              <div style={{ color: "var(--ink-600)", fontSize: 14 }}>{rx.meds.length}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(rx); }}>View</button>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openPatient(rx.patientId); }}>Patient</button>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && <RecordModal rx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
