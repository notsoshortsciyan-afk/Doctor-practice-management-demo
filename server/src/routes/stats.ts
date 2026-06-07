import { Router } from "express";
import { prisma } from "../lib/prisma";
import { wrap } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Daily chair capacity assumption for utilization (clinic open ~9–17, 30-min slots).
const DAILY_CAPACITY = 16;

router.get(
  "/",
  wrap(async (_req, res) => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [totalPatients, todaysAppts, pendingToday, paymentsThisWeek, paymentsPrevWeek, invoices] =
      await Promise.all([
        prisma.patient.count(),
        prisma.appointment.count({
          where: { dateTime: { gte: startToday, lt: endToday }, status: { not: "Cancelled" } },
        }),
        prisma.appointment.count({
          where: { dateTime: { gte: startToday, lt: endToday }, status: "Pending" },
        }),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { date: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        prisma.invoice.findMany({ include: { payments: true } }),
      ]);

    const weeklyRevenue = paymentsThisWeek._sum.amount ?? 0;
    const prevWeekRevenue = paymentsPrevWeek._sum.amount ?? 0;
    const revenueDelta =
      prevWeekRevenue > 0 ? ((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : null;

    const outstanding = invoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, inv.total - paid);
    }, 0);

    const utilization = Math.min(100, Math.round((todaysAppts / DAILY_CAPACITY) * 100));

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
