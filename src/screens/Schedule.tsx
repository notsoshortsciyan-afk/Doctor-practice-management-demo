import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevL,
  IconChevR,
  IconDot3V,
  IconPlus,
  IconUser,
  IconX,
} from "../icons";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from "../api/hooks";
import { Modal } from "../components/Modal";
import { PatientSearchSelect, type PickedPatient } from "../components/PatientSearchSelect";
import type { ApiAppointment, AppointmentStatus } from "../api/types";

const PROCS = [
  "Annual Cleaning & Check-up", "Root Canal Follow-up", "Crown Placement", "Cavity Filling",
  "Wisdom Tooth Extraction", "Orthodontic Adjustment", "Whitening Treatment", "Consultation",
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toLocalInput(d: Date): string {
  return `${ymd(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function AppointmentModal({
  date,
  existing,
  onClose,
}: {
  date: Date;
  existing?: ApiAppointment | null;
  onClose: () => void;
}) {
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const [patient, setPatient] = useState<PickedPatient | null>(
    existing ? { id: existing.patientId, name: existing.patientName, code: existing.patientCode, phone: "" } : null
  );
  const [when, setWhen] = useState(existing ? existing.dateTime.slice(0, 16) : toLocalInput(new Date(date.getTime())));
  const [procedure, setProcedure] = useState(existing?.procedure ?? PROCS[0]);
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? "Confirmed");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!existing && !patient) {
      setError("Select a patient.");
      return;
    }
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, data: { dateTime: new Date(when).toISOString(), procedure, status } });
      } else {
        await create.mutateAsync({ patientId: patient!.id, dateTime: new Date(when).toISOString(), procedure, status });
      }
      onClose();
    } catch {
      setError("Could not save the appointment.");
    }
  };

  return (
    <Modal
      title={existing ? "Reschedule Appointment" : "New Appointment"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={create.isPending || update.isPending}>Save</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!existing && (
          <div className="field">
            <label className="label">Patient</label>
            <PatientSearchSelect value={patient} onChange={setPatient} />
          </div>
        )}
        {existing && (
          <div style={{ color: "var(--ink-600)" }}>
            <strong style={{ color: "var(--navy-900)" }}>{existing.patientName}</strong> · {existing.patientCode}
          </div>
        )}
        <div className="field">
          <label className="label">Date & Time</label>
          <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Procedure</label>
          <select className="select" value={procedure} onChange={(e) => setProcedure(e.target.value)}>
            {PROCS.map((p) => (<option key={p}>{p}</option>))}
          </select>
        </div>
        <div className="field">
          <label className="label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
            <option>Confirmed</option>
            <option>Pending</option>
            <option>Cancelled</option>
          </select>
        </div>
        {error && <div style={{ background: "var(--danger-bg)", color: "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{error}</div>}
      </div>
    </Modal>
  );
}

function ApptCard({ appt, onView, onStatus, onReschedule, onDelete }: {
  appt: ApiAppointment;
  onView: () => void;
  onStatus: (s: AppointmentStatus) => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const chip = appt.status === "Confirmed" ? "chip-confirmed" : appt.status === "Pending" ? "chip-pending" : "chip-inactive";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr auto auto", gap: 16, alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--border-soft)" }}>
      <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.time}</div>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.patientName}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13 }}>{appt.procedure}</div>
      </div>
      <span className={`chip ${chip}`} style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>{appt.status}</span>
      <div className="menu-anchor">
        <button className="btn btn-ghost btn-sm" style={{ width: 32, padding: 0 }} onClick={() => setOpen((o) => !o)}><IconDot3V size={18} /></button>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
            <div className="menu" style={{ right: 0 }}>
              <div className="menu-item" onClick={() => { onView(); setOpen(false); }}><IconUser size={16} /> View patient</div>
              <div className="menu-item" onClick={() => { onStatus("Confirmed"); setOpen(false); }}><IconCheck size={16} /> Confirm</div>
              <div className="menu-item" onClick={() => { onReschedule(); setOpen(false); }}><IconCalendar size={16} /> Reschedule</div>
              <div className="menu-item danger" onClick={() => { onStatus("Cancelled"); setOpen(false); }}><IconX size={16} /> Cancel</div>
              <div className="menu-item danger" onClick={() => { onDelete(); setOpen(false); }}><IconX size={16} /> Delete</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Schedule({ openPatient, showToast }: { openPatient: (id: string) => void; showToast: (m: string) => void }) {
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApiAppointment | null>(null);
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  const range = useMemo(() => {
    const from = new Date(date);
    const to = new Date(date);
    to.setDate(to.getDate() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [date]);

  const { data, isLoading } = useAppointments(range);
  const list = data ?? [];

  const shift = (days: number) => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
  const isToday = ymd(date) === ymd(new Date());
  const label = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="page" data-screen-label="Schedule">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div>
          <h1 className="h1">Schedule</h1>
          <div className="lede" style={{ fontSize: 16 }}>Book and manage appointments for the clinic.</div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}><IconPlus size={18} /> New Appointment</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
        <button className="pgn-btn" onClick={() => shift(-1)}><IconChevL size={16} /></button>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 18, minWidth: 320 }}>{label}</div>
        <button className="pgn-btn" onClick={() => shift(1)}><IconChevR size={16} /></button>
        {!isToday && <button className="btn btn-soft btn-sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d); }}>Today</button>}
        <div style={{ marginLeft: "auto", color: "var(--ink-500)", fontSize: 14 }}>
          {list.filter((a) => a.status !== "Cancelled").length} active · {list.length} total
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--ink-500)" }}>
            <IconCalendar size={48} style={{ color: "var(--ink-300)", margin: "0 auto" }} />
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 16, marginTop: 12 }}>No appointments</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Nothing booked for this day.</div>
          </div>
        ) : (
          list.map((a) => (
            <ApptCard
              key={a.id}
              appt={a}
              onView={() => openPatient(a.patientId)}
              onStatus={(s) => updateAppt.mutate({ id: a.id, data: { status: s } })}
              onReschedule={() => setEditing(a)}
              onDelete={() => deleteAppt.mutate(a.id, { onSuccess: () => showToast("Appointment deleted.") })}
            />
          ))
        )}
      </div>

      {creating && <AppointmentModal date={date} onClose={() => setCreating(false)} />}
      {editing && <AppointmentModal date={date} existing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
