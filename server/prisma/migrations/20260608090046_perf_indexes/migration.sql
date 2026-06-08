-- CreateIndex
CREATE INDEX "Patient_status_idx" ON "Patient"("status");

-- CreateIndex
CREATE INDEX "idx_appointments_date_status" ON "appointments"("appointment_date", "status");
