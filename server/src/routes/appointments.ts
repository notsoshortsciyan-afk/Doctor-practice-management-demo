import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { appointmentInclude, serializeAppointment } from "../lib/serialize";

const router = Router();
router.use(requireAuth);

// GET /api/appointments?from=&to=&today=1
router.get(
  "/",
  wrap(async (req, res) => {
    const where: Prisma.AppointmentWhereInput = {};
    if (req.query.today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.dateTime = { gte: start, lt: end };
    } else if (req.query.from || req.query.to) {
      where.dateTime = {};
      if (req.query.from) (where.dateTime as Prisma.DateTimeFilter).gte = new Date(String(req.query.from));
      if (req.query.to) (where.dateTime as Prisma.DateTimeFilter).lt = new Date(String(req.query.to));
    }
    if (req.query.patientId) where.patientId = String(req.query.patientId);

    const rows = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { dateTime: "asc" },
    });
    res.json(rows.map(serializeAppointment));
  })
);

const createSchema = z.object({
  patientId: z.string().min(1),
  dateTime: z.string().min(1),
  procedure: z.string().min(1),
  status: z.enum(["Confirmed", "Pending", "Cancelled"]).optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(createSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const appt = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        dateTime: new Date(body.dateTime),
        procedure: body.procedure,
        status: body.status ?? "Pending",
        notes: body.notes,
        providerId: req.user!.role === "DOCTOR" ? req.user!.sub : null,
      },
      include: appointmentInclude,
    });
    res.status(201).json(serializeAppointment(appt));
  })
);

const updateSchema = z.object({
  dateTime: z.string().optional(),
  procedure: z.string().optional(),
  status: z.enum(["Confirmed", "Pending", "Cancelled"]).optional(),
  notes: z.string().optional(),
});

router.patch(
  "/:id",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(updateSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        ...(body.dateTime ? { dateTime: new Date(body.dateTime) } : {}),
        ...(body.procedure ? { procedure: body.procedure } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: appointmentInclude,
    });
    res.json(serializeAppointment(appt));
  })
);

router.delete(
  "/:id",
  requireRole("DOCTOR", "RECEPTIONIST"),
  wrap(async (req, res) => {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
