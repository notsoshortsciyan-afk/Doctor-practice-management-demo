import { useEffect, useMemo, useState } from "react";
import {
  IconCalendar,
  IconChev,
  IconChevL,
  IconChevR,
  IconFilter,
  IconSearch,
} from "../icons";
import { usePatients, useSavePatient } from "../api/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { TableRowsSkeleton } from "../components/Skeleton";
import { PatientFormModal } from "../components/PatientFormModal";
import type { ApiPatient } from "../api/types";

const PAGE_SIZE = 8;
const STATUS_LABELS = ["Active", "Follow-up", "Inactive", "Pending"] as const;

type StatusOption = "All Statuses" | "Active" | "Follow-up" | "Inactive" | "Pending";
type SortKey = "recent" | "name" | "next" | "id";

function StatusFilter({ value, onChange }: { value: StatusOption; onChange: (v: StatusOption) => void }) {
  const [open, setOpen] = useState(false);
  const opts: StatusOption[] = ["All Statuses", "Active", "Follow-up", "Inactive", "Pending"];
  return (
    <div className="menu-anchor" style={{ flex: 1 }}>
      <button className="btn btn-outline" style={{ width: "100%", justifyContent: "space-between", height: 48 }} onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconFilter size={16} /> {value}
        </span>
        <IconChev size={16} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
          <div className="menu" style={{ left: 0, right: 0 }}>
            {opts.map((o) => (
              <div key={o} className="menu-item" onClick={() => { onChange(o); setOpen(false); }}>{o}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortFilter({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const opts: { key: SortKey; label: string }[] = [
    { key: "recent", label: "Sort by: Recent Visit" },
    { key: "name", label: "Sort by: Name (A-Z)" },
    { key: "next", label: "Sort by: Next Appointment" },
    { key: "id", label: "Sort by: Patient ID" },
  ];
  const cur = opts.find((o) => o.key === value) || opts[0];
  return (
    <div className="menu-anchor" style={{ flex: 1 }}>
      <button className="btn btn-outline" style={{ width: "100%", justifyContent: "space-between", height: 48 }} onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconCalendar size={16} /> {cur.label}
        </span>
        <IconChev size={16} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
          <div className="menu" style={{ left: 0, right: 0 }}>
            {opts.map((o) => (
              <div key={o.key} className="menu-item" onClick={() => { onChange(o.key); setOpen(false); }}>{o.label}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Quick status editor shown right in the directory row. Clicking the chip opens a
// small menu; picking a status PUTs the full patient payload (the server's PUT
// requires the complete body, so we rebuild it from the row) and the list refreshes.
function StatusChipMenu({ p }: { p: ApiPatient }) {
  const [open, setOpen] = useState(false);
  const save = useSavePatient();

  const change = (status: string) => {
    setOpen(false);
    if (status === p.status.key) return;
    save.mutate({
      id: p.id,
      data: {
        name: p.name,
        phone: p.phone,
        email: p.email || undefined,
        age: p.age,
        gender: p.gender,
        blood: p.blood,
        status,
        risk: p.risk,
        conditions: p.conditions,
        allergies: p.allergies,
        medications: p.medications,
        address: p.address || "",
      },
    });
  };

  return (
    <div className="menu-anchor" onClick={(e) => e.stopPropagation()}>
      <button
        className={`chip ${p.status.chip}`}
        style={{ border: 0, cursor: "pointer", opacity: save.isPending ? 0.6 : 1 }}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={save.isPending}
        title="Change status"
      >
        {p.status.key} <IconChev size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="menu" style={{ minWidth: 160 }}>
            {STATUS_LABELS.map((s) => (
              <div
                key={s}
                className="menu-item"
                onClick={(e) => { e.stopPropagation(); change(s); }}
                style={{ fontWeight: s === p.status.key ? 700 : 400, color: s === p.status.key ? "var(--navy-900)" : undefined }}
              >
                {s}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PatientRow({ p, onView, onEdit }: { p: ApiPatient; onView: () => void; onEdit: () => void }) {
  const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="dt-row" style={{ gridTemplateColumns: "2.2fr 1fr 1.2fr 1.5fr 1fr 1.3fr" }} onClick={onView}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="placeholder-stripe" style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: "var(--navy-900)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 13 }}>{initials}</div>
        <div>
          <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{p.name}</div>
          <div style={{ color: "var(--ink-500)", fontSize: 12, marginTop: 2 }}>{p.phone}</div>
        </div>
      </div>
      <div style={{ color: "var(--ink-600)", fontSize: 14, fontFamily: "var(--font-b)" }}>{p.code}</div>
      <div style={{ color: "var(--ink-600)", fontSize: 14 }}>{p.lastVisit?.label ?? "—"}</div>
      <div>
        {p.nextAppt ? (
          <>
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 14 }}>{p.nextAppt.label}</div>
            <div style={{ color: "var(--ink-500)", fontSize: 12, marginTop: 2 }}>{p.apptTime} · {(p.procedure ?? "").split(" ").slice(0, 3).join(" ")}</div>
          </>
        ) : (
          <span style={{ color: "var(--ink-400)" }}>Not scheduled</span>
        )}
      </div>
      <div><StatusChipMenu p={p} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>Edit</button>
        <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); onView(); }}>View</button>
      </div>
    </div>
  );
}

function Pagination({ page, setPage, totalPages }: { page: number; setPage: (p: number) => void; totalPages: number }) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>([1, totalPages, page]);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | string)[] = [];
  let prev = 0;
  sorted.forEach((p) => {
    if (p - prev > 1) out.push("…" + p);
    out.push(p);
    prev = p;
  });
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button className="pgn-btn" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}>
        <IconChevL size={16} />
      </button>
      {out.map((item, i) => {
        if (typeof item === "string") return <span key={i} style={{ padding: "0 4px", color: "var(--ink-400)" }}>…</span>;
        return (
          <button key={i} className={`pgn-btn ${item === page ? "active" : ""}`} onClick={() => setPage(item)}>{item}</button>
        );
      })}
      <button className="pgn-btn" disabled={page === totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))}>
        <IconChevR size={16} />
      </button>
    </div>
  );
}

interface DirectoryProps {
  openPatient: (id: string) => void;
  initialQuery?: string;
  isDoctor: boolean;
}

export function Directory({ openPatient, initialQuery, isDoctor }: DirectoryProps) {
  const [q, setQ] = useState(initialQuery ?? "");
  const [status, setStatus] = useState<StatusOption>("All Statuses");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ApiPatient | null>(null);

  // Drive the query off a debounced copy of the search box so each keystroke
  // updates the input instantly but only fires one request once typing pauses.
  const debouncedQ = useDebouncedValue(q, 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, sort]);

  const params = useMemo(
    () => ({
      q: debouncedQ,
      status: status === "All Statuses" ? "" : status,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedQ, status, sort, page]
  );

  const { data, isLoading, isError } = usePatients(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="page" data-screen-label="02 Patient Directory">
      <div className="crumbs">
        <a>Dashboard</a>
        <IconChevR size={14} />
        <span className="active">Patients</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginTop: 4 }}>
        <div>
          <h1 className="h1">Patient Directory</h1>
          <div className="lede" style={{ fontSize: 16 }}>Manage and monitor patient dental records and appointments. New patients are added automatically from New Entry.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginTop: 32 }}>
        <div className="input-with-icon">
          <IconSearch size={18} />
          <input className="input" style={{ height: 48 }} placeholder="Search by name, ID, or phone number…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <StatusFilter value={status} onChange={setStatus} />
        <SortFilter value={sort} onChange={setSort} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="dt-head" style={{ gridTemplateColumns: "2.2fr 1fr 1.2fr 1.5fr 1fr 1.3fr" }}>
          <div className="col">Patient Name</div>
          <div className="col">ID Number</div>
          <div className="col">Last Visit</div>
          <div className="col">Next Appointment</div>
          <div className="col">Status</div>
          <div className="col" style={{ textAlign: "right" }}>Actions</div>
        </div>
        {isLoading ? (
          <TableRowsSkeleton rows={PAGE_SIZE} cols={6} gridTemplateColumns="2.2fr 1fr 1.2fr 1.5fr 1fr 1.3fr" />
        ) : isError ? (
          <EmptyState title="Couldn't load patients" sub="Is the API server running?" />
        ) : items.length === 0 ? (
          <EmptyState title="No patients match" sub="Try clearing filters or searching by a different term." />
        ) : (
          items.map((p) => <PatientRow key={p.id} p={p} onView={() => openPatient(p.id)} onEdit={() => setEditing(p)} />)
        )}
      </div>

      <div style={{ marginTop: 16, padding: "16px 24px", background: "var(--bg-soft)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "var(--ink-600)", fontSize: 14 }}>
          Showing <strong style={{ color: "var(--navy-900)" }}>{items.length}</strong> of <strong style={{ color: "var(--navy-900)" }}>{total}</strong> patients
        </div>
        <Pagination page={page} setPage={setPage} totalPages={totalPages} />
      </div>

      {editing && (
        <PatientFormModal
          patient={editing}
          isDoctor={isDoctor}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ padding: 64, textAlign: "center", color: "var(--ink-500)", background: "var(--bg-card)", border: "1px solid var(--border-soft)", borderTop: 0, borderRadius: "0 0 10px 10px" }}>
      <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 16 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13 }}>{sub}</div>
    </div>
  );
}
