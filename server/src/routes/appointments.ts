import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { serializeAppointment } from "../lib/serialize";
import { SLOTS, slotIndex, isValidSlot, isYmd, clinicToday, dateOnlyUTC } from "../lib/slots";

const router = Router();
router.use(requireAuth);

const STATUSES = ["pending", "confirmed", "cancelled"] as const;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_TAKEN_MSG = "That slot was just taken — please pick another time.";

// The shared partial unique index (uniq_active_slot) enforces one active booking
// per (date, slot). Prisma maps the Postgres 23505 to P2002; since the index isn't
// modeled in the schema it can also surface as a raw error, so check both.
function isSlotTaken(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("23505") || msg.includes("uniq_active_slot");
}

// appointments.id is a BIGINT identity — parse the path param defensively.
function parseId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

// GET /api/appointments?date=YYYY-MM-DD&status=pending|confirmed|cancelled&today=1
// Lists bookings from the shared table. With a day filter, sorts chronologically by
// slot; otherwise newest-first.
router.get(
  "/",
  wrap(async (req, res) => {
    const where: Prisma.AppointmentWhereInput = {};

    let day: string | null = null;
    if (req.query.today) day = clinicToday();
    else if (typeof req.query.date === "string" && isYmd(req.query.date)) day = req.query.date;
    if (day) where.appointmentDate = dateOnlyUTC(day);

    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;

    const rows = await prisma.appointment.findMany({
      where,
      orderBy: day ? { createdAt: "asc" } : [{ appointmentDate: "desc" }, { createdAt: "desc" }],
    });

    // The text time label can't be ordered in SQL; sort a day's rows by slot order.
    const ordered = day
      ? [...rows].sort(
          (a, b) =>
            (slotIndex.get(a.appointmentTime) ?? 99) - (slotIndex.get(b.appointmentTime) ?? 99),
        )
      : rows;

    res.json(ordered.map(serializeAppointment));
  }),
);

// GET /api/appointments/availability?date=YYYY-MM-DD
// For a day, which of the fixed slots are taken (any non-cancelled booking).
router.get(
  "/availability",
  wrap(async (req, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : "";
    if (!isYmd(date)) throw new HttpError(400, "A valid ?date=YYYY-MM-DD is required.");

    const taken = await prisma.appointment.findMany({
      where: { appointmentDate: dateOnlyUTC(date), status: { not: "cancelled" } },
      select: { appointmentTime: true },
    });
    const takenSet = new Set(taken.map((t) => t.appointmentTime));

    res.json({
      date,
      slots: SLOTS.map((time) => ({ time, booked: takenSet.has(time) })),
    });
  }),
);

const createSchema = z.object({
  fullName: z.string().min(1),
  contactNumber: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  reason: z.string().optional(),
  appointmentDate: z.string().regex(YMD, "Expected YYYY-MM-DD"),
  appointmentTime: z.string().refine(isValidSlot, "Not a recognized time slot"),
});

// POST /api/appointments — receptionist-created (walk-in/phone) booking.
// Staff-entered, so default status = 'confirmed'; source = 'manual'.
router.post(
  "/",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(createSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    try {
      const appt = await prisma.appointment.create({
        data: {
          fullName: body.fullName,
          contactNumber: body.contactNumber,
          email: body.email ? body.email : null,
          reason: body.reason ? body.reason : null,
          appointmentDate: dateOnlyUTC(body.appointmentDate),
          appointmentTime: body.appointmentTime,
          status: "confirmed",
          source: "manual",
        },
      });
      res.status(201).json(serializeAppointment(appt));
    } catch (e) {
      if (isSlotTaken(e)) throw new HttpError(409, SLOT_TAKEN_MSG);
      throw e;
    }
  }),
);

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  appointmentDate: z.string().regex(YMD, "Expected YYYY-MM-DD").optional(),
  appointmentTime: z.string().refine(isValidSlot, "Not a recognized time slot").optional(),
});

// PATCH /api/appointments/:id — confirm / cancel / reschedule.
router.patch(
  "/:id",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(updateSchema),
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) throw new HttpError(400, "Invalid appointment id.");
    const body = req.body as z.infer<typeof updateSchema>;
    try {
      const appt = await prisma.appointment.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.appointmentDate ? { appointmentDate: dateOnlyUTC(body.appointmentDate) } : {}),
          ...(body.appointmentTime ? { appointmentTime: body.appointmentTime } : {}),
        },
      });
      res.json(serializeAppointment(appt));
    } catch (e) {
      if (isSlotTaken(e)) throw new HttpError(409, SLOT_TAKEN_MSG);
      throw e;
    }
  }),
);

// DELETE /api/appointments/:id — hard delete (cleanup). Cancelling is the primary path.
router.delete(
  "/:id",
  requireRole("DOCTOR", "RECEPTIONIST"),
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) throw new HttpError(400, "Invalid appointment id.");
    await prisma.appointment.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

export default router;
