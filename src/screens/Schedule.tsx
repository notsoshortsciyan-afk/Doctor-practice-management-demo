import { useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevL,
  IconChevR,
  IconExternalLink,
  IconLock,
  IconPlus,
  IconX,
} from "../icons";
import { KebabMenu } from "../components/KebabMenu";
import {
  useAppointments,
  useUpdateAppointment,
  useDeleteAppointment,
  useSlotAvailability,
  useLockSlot,
  useUnlockSlot,
  useClinicSettings,
} from "../api/hooks";
import { Skeleton, SkeletonText } from "../components/Skeleton";
import { APPOINTMENT_SLOTS } from "../data";
import { ymd } from "../lib/dateRange";
import type { ApiAppointment, AppointmentSource, AppointmentStatus } from "../api/types";

// Bookings are created on the public clinic site, not in the dashboard. "New
// Appointment" opens it in a new tab (the dashboard stays put behind it).
const APPOINTMENT_BOOKING_URL = "https://drashraf.vercel.app/appointment";

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

// ── Slot locking ──────────────────────────────────────────────
// Bookings no longer reserve a slot — patients can keep booking the same time.
// This grid shows each slot's live booking count and flags it "full" past the
// clinic threshold; staff lock a slot to actually stop new bookings (on the
// website too). Polls so counts/locks from elsewhere appear without a refresh.
type AvailSlot = { time: string; bookingCount: number; locked: boolean; lockId: string | null };

function LockLegend({ swatch, border, label }: { swatch: string; border: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: swatch, border: `1px solid ${border}` }} />
      {label}
    </span>
  );
}

function SlotLockGrid({ date, showToast }: { date: string; showToast: (m: string) => void }) {
  const availability = useSlotAvailability(date, {
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const clinic = useClinicSettings();
  const fullAt = clinic.data?.slotFullAt ?? 5;
  const lock = useLockSlot();
  const unlock = useUnlockSlot();
  const [busyTime, setBusyTime] = useState<string | null>(null);

  const slots: AvailSlot[] =
    availability.data?.slots ??
    APPOINTMENT_SLOTS.map((time) => ({ time, bookingCount: 0, locked: false, lockId: null }));

  const toggle = (s: AvailSlot) => {
    if (busyTime) return; // one action at a time
    setBusyTime(s.time);
    const done = () => setBusyTime(null);
    if (s.locked && s.lockId) {
      unlock.mutate(s.lockId, {
        onSuccess: () => showToast("Slot unlocked — open for booking again."),
        onError: (e) => showToast(e instanceof Error ? e.message : "Could not unlock the slot."),
        onSettled: done,
      });
    } else {
      lock.mutate(
        { date, time: s.time },
        {
          onSuccess: () => showToast("Slot locked — it can't be booked on the website."),
          onError: (e) => showToast(e instanceof Error ? e.message : "Could not lock the slot."),
          onSettled: done,
        },
      );
    }
  };

  return (
    <div className="card" style={{ marginTop: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-soft-3)", display: "grid", placeItems: "center", color: "var(--navy-900)" }}>
          <IconLock size={17} />
        </div>
        <div>
          <h2 className="h2" style={{ fontSize: 16 }}>Time Slots</h2>
          <div style={{ color: "var(--ink-500)", fontSize: 13 }}>
            Bookings don't block a slot — lock one to stop new website bookings. Flagged "full" at {fullAt}.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 16 }}>
        {slots.map((s) => {
          const state = s.locked ? "locked" : s.bookingCount >= fullAt ? "full" : "open";
          const busy = busyTime === s.time;
          const sub =
            state === "locked"
              ? `Locked${s.bookingCount > 0 ? ` · ${s.bookingCount}` : ""}`
              : s.bookingCount === 0
                ? "No bookings"
                : `${s.bookingCount} booked${state === "full" ? " · full" : ""}`;
          return (
            <button
              key={s.time}
              type="button"
              disabled={busyTime !== null && !busy}
              onClick={() => toggle(s)}
              title={s.locked ? "Locked — click to unlock" : `${s.bookingCount} booking(s) — click to lock`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                height: 58,
                borderRadius: 10,
                padding: "6px 4px",
                fontFamily: "var(--font-h)",
                fontWeight: 700,
                fontSize: 13,
                border: `1px solid ${state === "locked" ? "var(--navy-900)" : state === "full" ? "var(--warn-ink)" : "var(--border-soft)"}`,
                background: state === "locked" ? "var(--navy-900)" : state === "full" ? "var(--warn-bg)" : "#fff",
                color: state === "locked" ? "#fff" : state === "full" ? "var(--warn-ink)" : "var(--navy-900)",
                cursor: "pointer",
                opacity: busy ? 0.6 : 1,
                transition: "border-color .15s, background .15s",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {state === "locked" && <IconLock size={13} />}
                {s.time}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  color: state === "locked" ? "rgba(255,255,255,.75)" : state === "full" ? "var(--warn-ink)" : "var(--ink-500)",
                }}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 12, color: "var(--ink-500)" }}>
        <LockLegend swatch="#fff" border="var(--border-soft)" label="Open" />
        <LockLegend swatch="var(--warn-bg)" border="var(--warn-ink)" label={`Full (${fullAt}+)`} />
        <LockLegend swatch="var(--navy-900)" border="var(--navy-900)" label="Locked" />
        {availability.isLoading && <span style={{ marginLeft: "auto" }}>Checking availability…</span>}
      </div>
    </div>
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

// Matches ApptCard's grid so the loading state holds the same shape.
function ApptCardSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "96px 1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "16px 20px",
        borderTop: "1px solid var(--border-soft)",
      }}
    >
      <SkeletonText w={64} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonText w={150} />
        <SkeletonText w={240} />
      </div>
      <Skeleton w={72} h={22} radius={999} />
      <Skeleton w={20} h={20} radius={6} />
    </div>
  );
}

export function Schedule({ showToast }: { showToast: (m: string) => void }) {
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [status, setStatus] = useState("");
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  // Primary booking surface — poll so website/front-desk bookings appear without a refresh.
  const { data, isLoading } = useAppointments(
    { date: ymd(date), status: status || undefined },
    { refetchInterval: 7_000, refetchOnWindowFocus: true, staleTime: 0 },
  );
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
        <button
          className="btn btn-primary btn-lg"
          onClick={() => window.open(APPOINTMENT_BOOKING_URL, "_blank", "noopener,noreferrer")}
          title="Opens the clinic booking site in a new tab"
        >
          <IconPlus size={18} /> New Appointment <IconExternalLink size={15} style={{ marginLeft: 2, opacity: 0.85 }} />
        </button>
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

      <SlotLockGrid date={ymd(date)} showToast={showToast} />

      <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
        {isLoading ? (
          <>
            <ApptCardSkeleton />
            <ApptCardSkeleton />
            <ApptCardSkeleton />
            <ApptCardSkeleton />
          </>
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
    </div>
  );
}
