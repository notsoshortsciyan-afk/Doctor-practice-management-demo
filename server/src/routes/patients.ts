import { Router } from "express";
import { z } from "zod";
import { Prisma, type PatientStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import {
  patientListInclude,
  serializePatient,
  serializeProcedure,
  serializeNote,
  serializePrescription,
  prescriptionInclude,
} from "../lib/serialize";

const router = Router();
router.use(requireAuth);

const STATUS_FROM_LABEL: Record<string, PatientStatus> = {
  Active: "Active",
  "Follow-up": "FollowUp",
  Inactive: "Inactive",
  Pending: "Pending",
};

async function genPatientCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `DC-${10000 + Math.floor(Math.random() * 89999)}`;
    const clash = await prisma.patient.findUnique({ where: { code } });
    if (!clash) return code;
  }
  return `DC-${Date.now().toString().slice(-5)}`;
}

// GET /api/patients?q=&status=&sort=&page=&pageSize=
router.get(
  "/",
  wrap(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const statusLabel = String(req.query.status ?? "");
    const sort = String(req.query.sort ?? "recent");
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "8"), 10) || 8));

    const where: Prisma.PatientWhereInput = {};
    if (statusLabel && STATUS_FROM_LABEL[statusLabel]) where.status = STATUS_FROM_LABEL[statusLabel];
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }

    // Sort + paginate in SQL so work is bounded by pageSize, not the whole table.
    // "next" is dead now that appointments aren't patient-linked; "recent" uses createdAt desc
    // as a close proxy for the derived last-visit ordering.
    const orderBy: Prisma.PatientOrderByWithRelationInput =
      sort === "name" ? { name: "asc" } : sort === "id" ? { code: "asc" } : { createdAt: "desc" };

    const [rows, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: patientListInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      items: rows.map(serializePatient),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

// GET /api/patients/:id  → full bundle
router.get(
  "/:id",
  wrap(async (req, res) => {
    const p = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        ...patientListInclude,
        procedures: { orderBy: { date: "desc" } },
        clinicalNotes: { orderBy: { date: "desc" } },
        prescriptions: { include: prescriptionInclude, orderBy: { date: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });
    if (!p) throw new HttpError(404, "Patient not found");

    // Clinical history is doctor-only; receptionists get the front-desk view.
    const isDoctor = req.user!.role === "DOCTOR";
    res.json({
      patient: serializePatient(p),
      procedures: isDoctor ? p.procedures.map(serializeProcedure) : [],
      notes: isDoctor ? p.clinicalNotes.map(serializeNote) : [],
      prescriptions: isDoctor ? p.prescriptions.map(serializePrescription) : [],
      documents: p.documents,
    });
  })
);

const patientBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.enum(["Male", "Female", "Other"]),
  blood: z.string().optional(),
  status: z.enum(["Active", "Follow-up", "Inactive", "Pending"]).optional(),
  risk: z.enum(["LOW", "MED", "HIGH"]).optional(),
  conditions: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  address: z.string().optional(),
});

function toData(body: z.infer<typeof patientBody>) {
  return {
    name: body.name,
    phone: body.phone,
    email: body.email || null,
    age: body.age,
    gender: body.gender,
    blood: body.blood?.trim() || null,
    status: body.status ? STATUS_FROM_LABEL[body.status] : undefined,
    risk: body.risk,
    conditions: body.conditions,
    allergies: body.allergies,
    medications: body.medications,
    address: body.address,
    avatarHue: Math.floor(Math.random() * 360),
  };
}

router.post(
  "/",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(patientBody),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof patientBody>;
    const created = await prisma.patient.create({
      data: { code: await genPatientCode(), ...toData(body) },
      include: patientListInclude,
    });
    res.status(201).json(serializePatient(created));
  })
);

router.put(
  "/:id",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(patientBody),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof patientBody>;
    const data = toData(body);
    // avatarHue should not be reshuffled on edit
    const { avatarHue: _omit, ...rest } = data;
    const updated = await prisma.patient.update({
      where: { id: req.params.id },
      data: rest,
      include: patientListInclude,
    });
    res.json(serializePatient(updated));
  })
);

router.delete(
  "/:id",
  requireRole("DOCTOR"),
  wrap(async (req, res) => {
    await prisma.patient.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

export default router;
