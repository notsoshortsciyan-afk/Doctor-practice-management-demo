import { Router } from "express";
import { prisma } from "../lib/prisma";
import { wrap } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { DAILY_CAPACITY, clinicToday, dateOnlyUTC, isYmd } from "../lib/slots";

const router = Router();
router.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;

// Period delta vs the immediately preceding equal-length window.
function deltaPct(cur: number, prev: number): number | null {
  return prev > 0 ? ((cur - prev) / prev) * 100 : null;
}

router.get(
  "/",
  wrap(async (req, res) => {
    const today = dateOnlyUTC(clinicToday());

    // Period window (drives patients / revenue / appointments cards). Defaults to
    // the current calendar month when from/to are absent or malformed. Bounds use
    // the same UTC-midnight convention as appointment_date: [gte, lt) — lt is the
    // day AFTER `to` so the whole `to` day is included.
    const todayYmd = clinicToday();
    const fromYmd = isYmd(String(req.query.from)) ? String(req.query.from) : `${todayYmd.slice(0, 8)}01`;
    const toYmd = isYmd(String(req.query.to)) ? String(req.query.to) : todayYmd;

    const gte = dateOnlyUTC(fromYmd);
    const lt = new Date(dateOnlyUTC(toYmd).getTime() + DAY_MS);
    // Preceding window of identical length, for the delta chips.
    const lengthDays = Math.round((lt.getTime() - gte.getTime()) / DAY_MS);
    const prevGte = new Date(gte.getTime() - lengthDays * DAY_MS);
    const prevLt = gte;

    const apptWhere = { status: { not: "cancelled" }, source: { not: "lock" } } as const;

    const [
      totalPatients,
      todaysAppts,
      pendingToday,
      inUseSlots,
      outstandingRows,
      periodPatients,
      prevPeriodPatients,
      periodRevenueAgg,
      prevPeriodRevenueAgg,
      periodAppointments,
      prevPeriodAppointments,
    ] = await Promise.all([
      // ── Snapshots (NOT affected by the date range) ──
      prisma.patient.count(),
      // Exclude locks (source='lock') — a locked slot is not a booking. Bookings
      // can stack on a slot, so this is a raw count (may exceed slot capacity).
      prisma.appointment.count({
        where: { appointmentDate: today, ...apptWhere },
      }),
      prisma.appointment.count({
        where: { appointmentDate: today, status: "pending", source: { not: "lock" } },
      }),
      // Chair utilization = how many of the day's fixed slots are in use (have a
      // booking OR a lock), so overbooking one slot can't push it past 100%.
      prisma.appointment.findMany({
        where: { appointmentDate: today, status: { not: "cancelled" } },
        select: { appointmentTime: true },
        distinct: ["appointmentTime"],
      }),
      // Outstanding = Σ max(invoice.total − paid, 0), computed in SQL so we don't pull every
      // invoice + payment into memory. GREATEST(...,0) preserves the per-invoice floor.
      prisma.$queryRaw<{ outstanding: number }[]>`
          SELECT COALESCE(SUM(GREATEST(i.total - COALESCE(p.paid, 0), 0)), 0)::float8 AS outstanding
          FROM "Invoice" i
          LEFT JOIN (SELECT "invoiceId", SUM(amount) AS paid FROM "Payment" GROUP BY "invoiceId") p
            ON p."invoiceId" = i.id`,

      // ── Period metrics (driven by from/to) ──
      prisma.patient.count({ where: { createdAt: { gte, lt } } }),
      prisma.patient.count({ where: { createdAt: { gte: prevGte, lt: prevLt } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte, lt } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: prevGte, lt: prevLt } } }),
      prisma.appointment.count({ where: { appointmentDate: { gte, lt }, ...apptWhere } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: prevGte, lt: prevLt }, ...apptWhere } }),
    ]);

    const outstanding = outstandingRows[0]?.outstanding ?? 0;
    const utilization = Math.min(100, Math.round((inUseSlots.length / DAILY_CAPACITY) * 100));

    const periodRevenue = periodRevenueAgg._sum.amount ?? 0;
    const prevPeriodRevenue = prevPeriodRevenueAgg._sum.amount ?? 0;

    res.json({
      // snapshots
      totalPatients,
      todaysBookings: todaysAppts,
      pendingToday,
      outstanding,
      chairUtilization: utilization,
      // period
      periodPatients,
      periodPatientsDeltaPct: deltaPct(periodPatients, prevPeriodPatients),
      periodRevenue,
      periodRevenueDeltaPct: deltaPct(periodRevenue, prevPeriodRevenue),
      periodAppointments,
      periodAppointmentsDeltaPct: deltaPct(periodAppointments, prevPeriodAppointments),
    });
  })
);

export default router;
