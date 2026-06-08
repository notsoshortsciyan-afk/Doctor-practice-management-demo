import { useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevL,
  IconChevR,
  IconPlus,
  IconX,
} from "../icons";
import { KebabMenu } from "../components/KebabMenu";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useSlotAvailability,
} from "../api/hooks";
import { Modal } from "../components/Modal";
import { APPOINTMENT_SLOTS } from "../data";
import type { ApiAppointment, AppointmentSource, AppointmentStatus } from "../api/types";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SourceBadge({ source }: { source: AppointmentSource }) {
  const isWeb = source === "website";
  return (
    <span
      title={isWeb ? "Booked on the website" : "Added at the front desk"}
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 6,
        color: isWeb ? "var(--navy-900)" : "var(--ink-500)",
        background: isWeb ? "var(--bg-soft-3)" : "var(--bg-soft)",
        border: "1px solid var(--border-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {isWeb ? "Website" : "Manual"}
    </span>
  );
}

function CreateModal({
  initialDate,
  onClose,
  showToast,
}: {
  initialDate: Date;
  onClose: () => void;
  showToast: (m: string) => void;
}) {
  const create = useCreateAppointment();
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(ymd(initialDate));
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availability = useSlotAvailability(date);
  const slots = availability.data?.slots ?? APPOINTMENT_SLOTS.map((time) => ({ time, booked: false }));

  const submit = async () => {
    setError(null);
    if (!fullName.trim() || !contactNumber.trim()) {
      setError("Patient name and contact number are required.");
      return;
    }
    if (!slot) {
      setError("Pick an available time slot.");
      return;
    }
    try {
      await create.mutateAsync({
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim() || undefined,
        reason: reason.trim() || undefined,
        appointmentDate: date,
        appointmentTime: slot,
      });
      showToast("Appointment added.");
      onClose();
    } catch (e) {
      // Surfaces the server's message, including the 409 "slot just taken".
      setError(e instanceof Error ? e.message : "Could not save the appointment.");
    }
  };

  return (
    <Modal
      title="New Appointment"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={create.isPending}>Save Appointment</button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label className="label">Patient Name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label className="label">Contact Number</label>
            <input className="input" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div className="field">
            <label className="label">Email <span style={{ color: "var(--ink-400)", fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
        </div>
        <div className="field">
          <label className="label">Reason <span style={{ color: "var(--ink-400)", fontWeight: 400 }}>(optional)</span></label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Toothache, Cleaning" />
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot(null); // availability changes with the date
            }}
          />
        </div>
        <div className="field">
          <label className="label">Time Slot</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {slots.map(({ time, booked }) => {
              const selected = slot === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={booked}
                  onClick={() => setSlot(time)}
                  style={{
                    height: 40,
                    borderRadius: 8,
                    fontFamily: "var(--font-h)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: `1px solid ${selected ? "var(--navy-900)" : "var(--border-soft)"}`,
                    background: selected ? "var(--navy-900)" : booked ? "var(--bg-soft)" : "#fff",
                    color: selected ? "#fff" : booked ? "var(--ink-300)" : "var(--navy-900)",
                    textDecoration: booked ? "line-through" : "none",
                    cursor: booked ? "not-allowed" : "pointer",
                  }}
                >
                  {time}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 6 }}>
            {availability.isLoading ? "Checking availability…" : "Greyed-out slots are already booked."}
          </div>
        </div>
        {error && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{error}</div>
        )}
      </div>
    </Modal>
  );
}

function ApptCard({
  appt,
  onStatus,
  onDelete,
}: {
  appt: ApiAppointment;
  onStatus: (s: AppointmentStatus) => void;
  onDelete: () => void;
}) {
  const chip =
    appt.status === "confirmed" ? "chip-confirmed" : appt.status === "pending" ? "chip-pending" : "chip-inactive";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "96px 1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "16px 20px",
        borderTop: "1px solid var(--border-soft)",
        opacity: appt.status === "cancelled" ? 0.65 : 1,
      }}
    >
      <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.appointmentTime}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.fullName}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {appt.reason || "No reason given"} · {appt.contactNumber}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SourceBadge source={appt.source} />
        <span className={`chip ${chip}`} style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>{titleCase(appt.status)}</span>
      </div>
      <KebabMenu>
        {(close) => (
          <>
            {appt.status !== "confirmed" && (
              <div className="menu-item" onClick={() => { onStatus("confirmed"); close(); }}><IconCheck size={16} /> Confirm</div>
            )}
            {appt.status === "cancelled" && (
              <div className="menu-item" onClick={() => { onStatus("pending"); close(); }}><IconCalendar size={16} /> Reopen (pending)</div>
            )}
            {appt.status !== "cancelled" && (
              <div className="menu-item danger" onClick={() => { onStatus("cancelled"); close(); }}><IconX size={16} /> Cancel</div>
            )}
            <div className="menu-item danger" onClick={() => { onDelete(); close(); }}><IconX size={16} /> Delete</div>
          </>
        )}
      </KebabMenu>
    </div>
  );
}

export function Schedule({ showToast }: { showToast: (m: string) => void }) {
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  const { data, isLoading } = useAppointments({ date: ymd(date), status: status || undefined });
  const list = data ?? [];

  const shift = (days: number) => setDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });
  const isToday = ymd(date) === ymd(new Date());
  const label = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const updateStatus = (a: ApiAppointment, s: AppointmentStatus) =>
    updateAppt.mutate(
      { id: a.id, data: { status: s } },
      { onError: (e) => showToast(e instanceof Error ? e.message : "Could not update the appointment.") },
    );

  return (
    <div className="page" data-screen-label="Schedule">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
        <div>
          <h1 className="h1">Schedule</h1>
          <div className="lede" style={{ fontSize: 16 }}>Website &amp; front-desk bookings, in one place.</div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}><IconPlus size={18} /> New Appointment</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
        <button className="pgn-btn" onClick={() => shift(-1)}><IconChevL size={16} /></button>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 18, minWidth: 320 }}>{label}</div>
        <button className="pgn-btn" onClick={() => shift(1)}><IconChevR size={16} /></button>
        {!isToday && <button className="btn btn-soft btn-sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d); }}>Today</button>}
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginLeft: "auto", width: 170 }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div style={{ color: "var(--ink-500)", fontSize: 14, whiteSpace: "nowrap" }}>
          {list.filter((a) => a.status !== "cancelled").length} active · {list.length} total
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-500)" }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: "var(--ink-500)" }}>
            <IconCalendar size={48} style={{ color: "var(--ink-300)", margin: "0 auto" }} />
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 16, marginTop: 12 }}>No appointments</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{status ? "None match this filter for the day." : "Nothing booked for this day."}</div>
          </div>
        ) : (
          list.map((a) => (
            <ApptCard
              key={a.id}
              appt={a}
              onStatus={(s) => updateStatus(a, s)}
              onDelete={() => deleteAppt.mutate(a.id, { onSuccess: () => showToast("Appointment deleted.") })}
            />
          ))
        )}
      </div>

      {creating && <CreateModal initialDate={date} onClose={() => setCreating(false)} showToast={showToast} />}
    </div>
  );
}
