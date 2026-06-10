import { useState, type ReactNode } from "react";
import {
  IconArrowRight,
  IconBeaker,
  IconBox,
  IconCalendar,
  IconCash,
  IconCheck,
  IconChev,
  IconTooth,
  IconUserPlus,
  IconUsers,
  IconX,
} from "../icons";
import { useAppointments, useStats, useUpdateAppointment } from "../api/hooks";
import { KebabMenu } from "../components/KebabMenu";
import { DateRangePicker } from "../components/DateRangePicker";
import { AppointmentRowSkeleton, StatCardSkeleton } from "../components/Skeleton";
import { useAuth } from "../auth/AuthContext";
import { money } from "../lib/money";
import { ymd, presetRange, rangeSubLabel, type RangeValue } from "../lib/dateRange";
import type { ApiAppointment, AppointmentStatus } from "../api/types";
import type { Route } from "../types";

function fmtDelta(pct: number | null | undefined): string | undefined {
  return pct == null ? undefined : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function StatCard({ icon, label, value, delta, sub }: { icon: ReactNode; label: string; value: string | number; delta?: string; sub?: string }) {
  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-soft-3)", display: "grid", placeItems: "center", color: "var(--navy-900)" }}>{icon}</div>
        {delta && <span className="stat-delta">{delta}</span>}
      </div>
      <div>
        <div className="eyebrow">{label}</div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 32, color: "var(--navy-900)", lineHeight: 1.2, marginTop: 6 }}>{value}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 4, minHeight: 18 }}>{sub}</div>
      </div>
    </div>
  );
}

function AppointmentRow({ appt, onUpdate }: { appt: ApiAppointment; onUpdate: (s: AppointmentStatus) => void }) {
  const chipClass = appt.status === "confirmed" ? "chip-confirmed" : appt.status === "pending" ? "chip-pending" : "chip-inactive";
  const initials = appt.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 56px 1fr auto auto", gap: 16, alignItems: "center", padding: "18px 24px", borderTop: "1px solid var(--border-soft)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 15 }}>{appt.appointmentTime.split(" ")[0]}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 12 }}>{appt.appointmentTime.split(" ")[1]}</div>
      </div>
      <div className="placeholder-stripe" style={{ width: 40, height: 40, display: "grid", placeItems: "center", color: "var(--navy-900)", fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 13 }}>{initials}</div>
      <div>
        <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)" }}>{appt.fullName}</div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginTop: 2 }}>{appt.reason || "No reason given"}</div>
      </div>
      <span className={`chip ${chipClass}`} style={{ textTransform: "uppercase", letterSpacing: ".06em", fontSize: 11 }}>{appt.status}</span>
      <KebabMenu>
        {(close) => (
          <>
            <div className="menu-item" onClick={() => { onUpdate("confirmed"); close(); }}><IconCheck size={16} /> Mark confirmed</div>
            <div className="menu-item" onClick={() => { onUpdate("pending"); close(); }}><IconCalendar size={16} /> Mark pending</div>
            <div className="menu-item danger" onClick={() => { onUpdate("cancelled"); close(); }}><IconX size={16} /> Cancel</div>
          </>
        )}
      </KebabMenu>
    </div>
  );
}

interface DashboardProps {
  go: (r: Route) => void;
  isDoctor: boolean;
}

export function Dashboard({ go, isDoctor }: DashboardProps) {
  const { user } = useAuth();
  // Period filter — scopes the patients / revenue / appointments cards only.
  const [range, setRange] = useState<RangeValue>(() => ({ preset: "thisMonth", ...presetRange("thisMonth") }));
  const stats = useStats({ from: range.from, to: range.to });
  // Use the client's local (clinic) date so "today" matches the receptionist's day.
  const appts = useAppointments(
    { date: ymd(new Date()) },
    { refetchInterval: 30_000, refetchOnWindowFocus: true },
  );
  const updateAppt = useUpdateAppointment();
  const [visible, setVisible] = useState(3);

  const list = appts.data ?? [];
  const active = list.filter((a) => a.status !== "cancelled");
  const confirmedToday = list.filter((a) => a.status === "confirmed").length;
  const pendingToday = list.filter((a) => a.status === "pending").length;
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const isAllTime = range.preset === "allTime";
  const periodSub = rangeSubLabel(range);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 32 }} data-screen-label="01 Dashboard">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div>
          <h1 className="h1">Welcome back, {user?.name ?? "Doctor"}</h1>
          <div className="lede">You have {active.length} appointment{active.length === 1 ? "" : "s"} scheduled for today.</div>
        </div>
        <div className="date-pill">
          <IconCalendar size={16} style={{ color: "var(--ink-500)" }} />
          <div style={{ textAlign: "left" }}>
            <div className="eyebrow" style={{ color: "var(--ink-500)", fontSize: 10 }}>Today</div>
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, color: "var(--navy-900)", fontSize: 15, lineHeight: 1.2 }}>{today}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <h2 className="h2">Overview</h2>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {stats.isPending ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                icon={<IconUsers size={22} />}
                label={isAllTime ? "Total Patients" : "New Patients"}
                value={stats.data ? stats.data.periodPatients.toLocaleString() : "—"}
                delta={fmtDelta(stats.data?.periodPatientsDeltaPct)}
                sub={isAllTime ? "Registered in the practice" : periodSub}
              />
              <StatCard
                icon={<IconCash size={22} />}
                label="Revenue"
                value={stats.data ? money(stats.data.periodRevenue) : "—"}
                delta={fmtDelta(stats.data?.periodRevenueDeltaPct)}
                sub={stats.data?.periodRevenueDeltaPct != null ? "vs. previous period" : periodSub}
              />
              <StatCard
                icon={<IconCalendar size={22} />}
                label="Appointments"
                value={stats.data ? stats.data.periodAppointments.toLocaleString() : "—"}
                delta={fmtDelta(stats.data?.periodAppointmentsDeltaPct)}
                sub={isAllTime ? "All bookings" : `Booked · ${periodSub}`}
              />
              <StatCard icon={<IconBeaker size={22} />} label="Outstanding Balance" value={stats.data ? money(stats.data.outstanding) : "—"} sub="Unpaid & partial invoices" />
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h2 className="h2">Today's Appointments</h2>
              <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{active.length} booked · {pendingToday} pending</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => go("schedule")}>View Schedule <IconArrowRight size={14} /></button>
          </div>
          <div>
            {appts.isPending ? (
              <>
                <AppointmentRowSkeleton />
                <AppointmentRowSkeleton />
                <AppointmentRowSkeleton />
              </>
            ) : list.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-500)" }}>No appointments scheduled today.</div>
            ) : (
              list.slice(0, visible).map((a) => (
                <AppointmentRow key={a.id} appt={a} onUpdate={(s) => updateAppt.mutate({ id: a.id, data: { status: s } })} />
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
              {isDoctor ? (
                <button className="btn btn-primary" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("entry")}>
                  <IconUserPlus size={18} /> New Prescription
                </button>
              ) : (
                <button className="btn btn-primary" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("directory")}>
                  <IconUsers size={18} /> Patient Directory
                </button>
              )}
              {isDoctor && (
                <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("directory")}>
                  <IconUsers size={18} /> Patient Directory
                </button>
              )}
              <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("schedule")}>
                <IconCalendar size={18} /> Open Schedule
              </button>
              <button className="btn btn-soft" style={{ justifyContent: "flex-start", height: 48 }} onClick={() => go("billing")}>
                <IconBox size={18} /> Billing & Invoices
              </button>
            </div>
          </div>

          <div className="card-dark dash-dark-card">
            <div className="glow" />
            <div style={{ position: "absolute", right: -18, bottom: -20, opacity: .1, color: "#fff" }}>
              <IconTooth size={150} />
            </div>
            <div style={{ position: "relative", padding: 24, display: "flex", flexDirection: "column", height: "100%", gap: 18 }}>
              <div className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>Today at a Glance</div>
              <div style={{ display: "flex", gap: 28 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 30, lineHeight: 1 }}>{confirmedToday}</div>
                  <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginTop: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Confirmed</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: 30, lineHeight: 1 }}>{pendingToday}</div>
                  <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginTop: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Pending</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.85)", fontSize: 13 }}>
                <span className="pulse-dot" /> {active.length} appointment{active.length === 1 ? "" : "s"} on the books
              </div>
              <button className="btn btn-yellow btn-sm" style={{ alignSelf: "flex-start", marginTop: "auto" }} onClick={() => go("schedule")}>
                View Schedule <IconArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
