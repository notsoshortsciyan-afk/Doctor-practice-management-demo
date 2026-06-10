import { Router } from "express";
import { prisma } from "../lib/prisma";
import { wrap } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { DAILY_CAPACITY, clinicToday, dateOnlyUTC } from "../lib/slots";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  wrap(async (_req, res) => {
    const now = new Date();
    const today = dateOnlyUTC(clinicToday());

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [totalPatients, todaysAppts, pendingToday, inUseSlots, paymentsThisWeek, paymentsPrevWeek, outstandingRows] =
      await Promise.all([
        prisma.patient.count(),
        // Exclude locks (source='lock') — a locked slot is not a booking. Bookings
        // can stack on a slot, so this is a raw count (may exceed slot capacity).
        prisma.appointment.count({
          where: { appointmentDate: today, status: { not: "cancelled" }, source: { not: "lock" } },
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
        prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { date: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        // Outstanding = Σ max(invoice.total − paid, 0), computed in SQL so we don't pull every
        // invoice + payment into memory. GREATEST(...,0) preserves the per-invoice floor.
        prisma.$queryRaw<{ outstanding: number }[]>`
          SELECT COALESCE(SUM(GREATEST(i.total - COALESCE(p.paid, 0), 0)), 0)::float8 AS outstanding
          FROM "Invoice" i
          LEFT JOIN (SELECT "invoiceId", SUM(amount) AS paid FROM "Payment" GROUP BY "invoiceId") p
            ON p."invoiceId" = i.id`,
      ]);

    const weeklyRevenue = paymentsThisWeek._sum.amount ?? 0;
    const prevWeekRevenue = paymentsPrevWeek._sum.amount ?? 0;
    const revenueDelta =
      prevWeekRevenue > 0 ? ((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : null;

    const outstanding = outstandingRows[0]?.outstanding ?? 0;

    const utilization = Math.min(100, Math.round((inUseSlots.length / DAILY_CAPACITY) * 100));

    res.json({
      totalPatients,
      todaysBookings: todaysAppts,
      pendingToday,
      weeklyRevenue,
      revenueDeltaPct: revenueDelta,
      outstanding,
      chairUtilization: utilization,
    });
  })
);

export default router;
