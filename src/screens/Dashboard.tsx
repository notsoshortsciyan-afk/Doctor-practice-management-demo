import { useState, type ReactNode } from "react";
import {
  IconArrowRight,
  IconBeaker,
  IconBox,
  IconCalendar,
  IconCash,
  IconCheck,
  IconChev,
  IconDot3V,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconX,
} from "../icons";
import { useAppointments, useStats, useUpdateAppointment } from "../api/hooks";
import { useAuth } from "../auth/AuthContext";
import { money } from "../lib/money";
import type { ApiAppointment, AppointmentStatus } from "../api/types";
import type { Route } from "../types";

function StatCard({ icon, label, value, delta, sub }: { icon: ReactNode; label: string; value: string | number; delta?: string; sub?: string }) {
  return (
    <div className="card card-pad" style={{ minHeight: 168, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-soft-3)", display: "grid", placeItems: "center", color: "var(--navy-900)" }}>{icon}</div>
        {delta && <span style={{ color: "var(--accent-yellow-ink)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em" }}>{delta}</span>}
      </div>
      <div>
        <div className="eyebrow">{label}</div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 32, color: "var(--navy-900)", lineHeight: 1.2, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function AppointmentRow({ appt, onUpdate, onView }: { appt: ApiAppointment; onUpdate: (s: AppointmentStatus) => void; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const chipClass = appt.status === "Confirmed" ? "chip-confirmed" : appt.status === "Pending" ? "chip-pending" : "chip-inactive";
  const initials = appt.patientName.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 56px 1fr auto auto", gap: 16, alignItems: "center", padding: "18px 24px", borderTop: "1px solid var(--border-soft)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 15 }}>{appt.time.split(" ")[0]}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 12 }}>{appt.time.split(" ")[1]}</div>
      </div>
      <div className="placeholder-stripe" style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: "var(--navy-900)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 13 }}>{initials}</div>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.patientName}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 2 }}>{appt.procedure}</div>
      </div>
      <span className={`chip ${chipClass}`} style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 11 }}>{appt.status}</span>
      <div className="menu-anchor">
        <button className="btn btn-ghost btn-sm" style={{ padding: 8, height: 32, width: 32 }} onClick={() => setOpen((o) => !o)}>
          <IconDot3V size={18} />
        </button>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 4 }} onClick={() => setOpen(false)} />
            <div className="menu">
              <div className="menu-item" onClick={() => { onView(); setOpen(false); }}><IconUser size={16} /> View patient</div>
              <div className="menu-item" onClick={() => { onUpdate("Confirmed"); setOpen(false); }}><IconCheck size={16} /> Mark confirmed</div>
              <div className="menu-item" onClick={() => { onUpdate("Pending"); setOpen(false); }}><IconCalendar size={16} /> Mark pending</div>
              <div className="menu-item danger" onClick={() => { onUpdate("Cancelled"); setOpen(false); }}><IconX size={16} /> Cancel</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DashboardProps {
  go: (r: Route) => void;
  openPatient: (id: string) => void;
  isDoctor: boolean;
}

export function Dashboard({ go, openPatient, isDoctor }: DashboardProps) {
  const { user } = useAuth();
  const stats = useStats();
  const appts = useAppointments({ today: true });
  const updateAppt = useUpdateAppointment();
  const [visible, setVisible] = useState(3);

  const list = appts.data ?? [];
  const active = list.filter((a) => a.status !== "Cancelled");
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const revenueDelta =
    stats.data?.revenueDeltaPct != null
      ? `${stats.data.revenueDeltaPct >= 0 ? "+" : ""}${stats.data.revenueDeltaPct.toFixed(1)}% vs last week`
      : "this week";

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 32 }} data-screen-label="01 Dashboard">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div>
          <h1 className="h1">Welcome back, {user?.name ?? "Doctor"}</h1>
          <div className="lede">You have {active.length} appointment{active.length === 1 ? "" : "s"} scheduled for today.</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="eyebrow" style={{ color: "var(--ink-500)" }}>Today's Date</div>
          <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 20, marginTop: 4 }}>{today}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        <StatCard icon={<IconUsers size={22} />} label="Total Patients" value={stats.data ? stats.data.totalPatients.toLocaleString() : "—"} sub="Registered in the practice" />
        <StatCard icon={<IconCalendar size={22} />} label="Today's Bookings" value={active.length} sub={`${stats.data?.pendingToday ?? 0} pending`} />
        <StatCard icon={<IconCash size={22} />} label="Weekly Revenue" value={stats.data ? money(stats.data.weeklyRevenue) : "—"} delta={revenueDelta} />
        <StatCard icon={<IconBeaker size={22} />} label="Outstanding Balance" value={stats.data ? money(stats.data.outstanding) : "—"} sub="Unpaid & partial invoices" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)" }}>
            <h2 className="h2">Today's Appointments</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => go("schedule")}>View Schedule <IconArrowRight size={14} /></button>
          </div>
          <div>
            {appts.isLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-500)" }}>Loading appointments…</div>
            ) : list.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-500)" }}>No appointments scheduled today.</div>
            ) : (
              list.slice(0, visible).map((a) => (
                <AppointmentRow key={a.id} appt={a} onUpdate={(s) => updateAppt.mutate({ id: a.id, data: { status: s } })} onView={() => openPatient(a.patientId)} />
              ))
            )}
          </div>
          {list.length > 3 && (
            <div style={{ background: "var(--bg-soft)", padding: 16, textAlign: "center" }}>
              {visible < list.length ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setVisible((v) => Math.min(v + 3, list.length))}>Load More <IconChev size={14} /></button>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setVisible(3)}>Collapse</button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card card-pad">
            <h2 className="h2" style={{ marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isDoctor && (
                <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("entry")}>
                  <IconUserPlus size={18} /> New Prescription
                </button>
              )}
              <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("directory")}>
                <IconUsers size={18} /> Patient Directory
              </button>
              <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("schedule")}>
                <IconCalendar size={18} /> Open Schedule
              </button>
              <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("billing")}>
                <IconBox size={18} /> Billing & Invoices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
