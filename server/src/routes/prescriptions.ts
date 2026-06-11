import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { prescriptionInclude, serializePrescription } from "../lib/serialize";
import { nextInvoiceNumber } from "../lib/invoiceNumber";
import { createPatientWithCode } from "../lib/patientCode";

const router = Router();
router.use(requireAuth);

// Reading prescriptions is clinical → doctor only.
router.get(
  "/",
  requireRole("DOCTOR"),
  wrap(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
    // Cap is generous so the Records screen can load the whole archive once and
    // search it in memory (instant, no per-keystroke fetch). A solo practice's
    // archive stays well within this; revisit if it ever approaches the cap.
    const take = Math.min(2000, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));

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
      // One SQL statement for rows + relations (medicines/patient/provider) —
      // the remote DB makes per-relation round trips the dominant cost.
      relationLoadStrategy: "join",
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
      relationLoadStrategy: "join",
      where: { id: req.params.id },
      include: prescriptionInclude,
    });
    if (!p) throw new HttpError(404, "Prescription not found");
    res.json(serializePrescription(p));
  })
);

// Medicine rows are forgiving: a row with no name is dropped in the handler, and
// a missing/blank frequency or duration is treated as empty rather than a 400.
const medStr = z.preprocess((v) => v ?? "", z.string());
const medSchema = z.object({
  name: medStr,
  dose: medStr,
  days: medStr,
});

// Coerce + clamp to a sane human range so a fat-fingered age (e.g. 150, 1120)
// never blocks a save — it lands at the nearest valid value instead of a 400.
// (Kept identical to the patients route's age handling.)
const ageField = z.coerce
  .number()
  .catch(0)
  .transform((n) => Math.min(130, Math.max(0, Math.round(n))));

const createSchema = z
  .object({
    patientId: z.string().optional(),
    // For brand-new walk-in patients created straight from the Rx form:
    newPatient: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(1),
        age: ageField,
        gender: z.preprocess(
          (v) => (v === "Male" || v === "Female" ? v : "Other"),
          z.enum(["Male", "Female", "Other"]),
        ),
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
    // Coerce so a stringified amount still parses; the handler ignores anything <= 0.
    invoiceAmount: z.coerce.number().optional(),
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

    // The optional walk-in patient create and the invoice-number lookup are
    // independent reads/writes — run them concurrently instead of back-to-back.
    const wantsInvoice = !!body.invoiceAmount && body.invoiceAmount > 0;
    const np = body.newPatient;
    const [createdPatient, invoiceNumber] = await Promise.all([
      !body.patientId && np
        ? createPatientWithCode((code) =>
            prisma.patient.create({
              data: {
                code,
                name: np.name,
                phone: np.phone,
                age: np.age,
                gender: np.gender,
                avatarHue: Math.floor(Math.random() * 360),
              },
            }),
          )
        : Promise.resolve(null),
      wantsInvoice ? nextInvoiceNumber() : Promise.resolve(null),
    ]);

    const patientId = body.patientId ?? createdPatient?.id;
    if (!patientId) throw new HttpError(400, "No patient specified");

    const meds = (body.meds ?? []).filter((m) => m.name.trim());

    const operations = [
      prisma.prescription.create({
        relationLoadStrategy: "join",
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

    if (invoiceNumber && body.invoiceAmount && body.invoiceAmount > 0) {
      operations.push(
        prisma.invoice.create({
          data: {
            patientId,
            number: invoiceNumber,
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
