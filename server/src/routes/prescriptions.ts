import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { prescriptionInclude, serializePrescription } from "../lib/serialize";

const router = Router();
router.use(requireAuth);

async function genPatientCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = `DC-${10000 + Math.floor(Math.random() * 89999)}`;
    const clash = await prisma.patient.findUnique({ where: { code } });
    if (!clash) return code;
  }
  return `DC-${Date.now().toString().slice(-5)}`;
}

// Reading prescriptions is clinical → doctor only.
router.get(
  "/",
  requireRole("DOCTOR"),
  wrap(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
    const take = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));

    const where: Prisma.PrescriptionWhereInput = {};
    if (patientId) where.patientId = patientId;
    if (q) {
      where.OR = [
        { diagnosis: { contains: q, mode: "insensitive" } },
        { complaint: { contains: q, mode: "insensitive" } },
        { patient: { name: { contains: q, mode: "insensitive" } } },
        { patient: { code: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.prescription.findMany({
      where,
      include: prescriptionInclude,
      orderBy: { date: "desc" },
      take,
    });
    res.json(rows.map(serializePrescription));
  })
);

router.get(
  "/:id",
  requireRole("DOCTOR"),
  wrap(async (req, res) => {
    const p = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: prescriptionInclude,
    });
    if (!p) throw new HttpError(404, "Prescription not found");
    res.json(serializePrescription(p));
  })
);

const medSchema = z.object({
  name: z.string(),
  dose: z.string(),
  days: z.string(),
});

const createSchema = z
  .object({
    patientId: z.string().optional(),
    // For brand-new walk-in patients created straight from the Rx form:
    newPatient: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(1),
        age: z.coerce.number().int().min(0).max(130),
        gender: z.enum(["Male", "Female", "Other"]),
      })
      .optional(),
    complaint: z.string().optional().default(""),
    observation: z.string().optional().default(""),
    diagnosis: z.string().optional().default(""),
    treatment: z.string().optional().default(""),
    advice: z.string().optional().default(""),
    teeth: z.record(z.string()).optional().default({}),
    tests: z.array(z.string()).optional().default([]),
    meds: z.array(medSchema).optional().default([]),
    invoiceAmount: z.number().positive().optional(),
  })
  .refine((d) => d.patientId || d.newPatient, {
    message: "Provide patientId or newPatient",
  });

// Writing prescriptions is clinical → doctor only.
router.post(
  "/",
  requireRole("DOCTOR"),
  validate(createSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;

    let patientId = body.patientId;
    if (!patientId && body.newPatient) {
      const np = body.newPatient;
      const created = await prisma.patient.create({
        data: {
          code: await genPatientCode(),
          name: np.name,
          phone: np.phone,
          age: np.age,
          gender: np.gender,
          avatarHue: Math.floor(Math.random() * 360),
        },
      });
      patientId = created.id;
    }
    if (!patientId) throw new HttpError(400, "No patient specified");

    const meds = (body.meds ?? []).filter((m) => m.name.trim());

    const operations = [
      prisma.prescription.create({
        data: {
          patientId,
          providerId: req.user!.sub,
          complaint: body.complaint ?? "",
          observation: body.observation ?? "",
          diagnosis: body.diagnosis ?? "",
          treatment: body.treatment ?? "",
          advice: body.advice ?? "",
          teeth: body.teeth as Prisma.InputJsonValue,
          tests: body.tests as Prisma.InputJsonValue,
          medicines: { create: meds },
        },
        include: prescriptionInclude,
      }),
    ];

    // A recorded treatment also becomes a row in the patient's procedure history.
    if (body.treatment && body.treatment.trim()) {
      operations.push(
        prisma.procedure.create({
          data: {
            patientId,
            name: body.treatment.trim(),
            description: body.diagnosis || "",
            date: new Date(),
            outcome: "Successful",
            icon: "tooth",
          },
        }) as any
      );
    }

    if (body.invoiceAmount) {
      const count = await prisma.invoice.count();
      const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      operations.push(
        prisma.invoice.create({
          data: {
            patientId,
            number,
            total: body.invoiceAmount,
            lineItems: [
              {
                description: body.treatment || body.diagnosis || "Consultation",
                amount: body.invoiceAmount,
              },
            ],
            status: "Unpaid",
          },
        }) as any
      );
    }

    const [rx] = await prisma.$transaction(operations);
    res.status(201).json(serializePrescription(rx));
  })
);

export default router;
