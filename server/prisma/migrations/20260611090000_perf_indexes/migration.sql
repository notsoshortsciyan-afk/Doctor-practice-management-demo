-- Re-expresses 20260608090046_perf_indexes, whose name sorted BEFORE the
-- migration that creates the shared "appointments" table — breaking every
-- replay onto a fresh/shadow database (and with it `prisma migrate dev`).
-- That folder + its ledger row were removed; this one carries its indexes
-- forward idempotently (IF NOT EXISTS = no-op on the live DB where they
-- already exist) and adds the new dashboard performance indexes.

-- Carried over from the removed 20260608090046_perf_indexes.
CREATE INDEX IF NOT EXISTS "Patient_status_idx" ON "Patient"("status");
CREATE INDEX IF NOT EXISTS "idx_appointments_date_status" ON "appointments"("appointment_date", "status");

-- Default Directory sort ("recent" = createdAt desc).
CREATE INDEX IF NOT EXISTS "Patient_createdAt_idx" ON "Patient"("createdAt");

-- Latest-prescription-per-patient lookup (patientListInclude take:1) and the
-- patient detail bundle's date-ordered prescription list.
CREATE INDEX IF NOT EXISTS "Prescription_patientId_date_idx" ON "Prescription"("patientId", "date");
