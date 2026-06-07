import { Router } from "express";
import { prisma } from "../lib/prisma";
import { wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// DOCTOR-only: permanently delete ALL patient/clinical data, leaving staff accounts
// and user settings untouched. Used by the "Delete all patient data" button in
// Settings to clear test data. Deletions run in FK-safe order (children first).
router.post(
  "/wipe",
  requireAuth,
  requireRole("DOCTOR"),
  wrap(async (_req, res) => {
    const [
      payments,
      invoices,
      prescriptionMedicines,
      prescriptions,
      clinicalNotes,
      procedures,
      documents,
      appointments,
      patients,
    ] = await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.prescriptionMedicine.deleteMany(),
      prisma.prescription.deleteMany(),
      prisma.clinicalNote.deleteMany(),
      prisma.procedure.deleteMany(),
      prisma.document.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.patient.deleteMany(),
    ]);

    res.json({
      ok: true,
      deleted: {
        patients: patients.count,
        appointments: appointments.count,
        prescriptions: prescriptions.count,
        prescriptionMedicines: prescriptionMedicines.count,
        clinicalNotes: clinicalNotes.count,
        procedures: procedures.count,
        documents: documents.count,
        invoices: invoices.count,
        payments: payments.count,
      },
    });
  })
);

export default router;
