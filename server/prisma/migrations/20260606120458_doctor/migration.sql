-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DOCTOR', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('Active', 'FollowUp', 'Inactive', 'Pending');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MED', 'HIGH');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Confirmed', 'Pending', 'Cancelled');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Paid', 'Partial', 'Unpaid', 'Overdue');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RECEPTIONIST',
    "initials" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "density" TEXT NOT NULL DEFAULT 'regular',
    "fontPair" TEXT NOT NULL DEFAULT 'default',
    "showSideCards" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "blood" TEXT NOT NULL,
    "status" "PatientStatus" NOT NULL DEFAULT 'Active',
    "risk" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "conditions" TEXT NOT NULL DEFAULT 'None reported',
    "allergies" TEXT NOT NULL DEFAULT 'None',
    "medications" TEXT NOT NULL DEFAULT 'None',
    "address" TEXT,
    "avatarHue" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "procedure" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complaint" TEXT NOT NULL DEFAULT '',
    "observation" TEXT NOT NULL DEFAULT '',
    "diagnosis" TEXT NOT NULL DEFAULT '',
    "advice" TEXT NOT NULL DEFAULT '',
    "teeth" JSONB NOT NULL DEFAULT '{}',
    "tests" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionMedicine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "days" TEXT NOT NULL,

    CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "italic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'Successful',
    "icon" TEXT NOT NULL DEFAULT 'tooth',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Unpaid',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Cash',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'xray',
    "label" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_code_key" ON "Patient"("code");

-- CreateIndex
CREATE INDEX "Appointment_dateTime_idx" ON "Appointment"("dateTime");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_date_idx" ON "Prescription"("date");

-- CreateIndex
CREATE INDEX "ClinicalNote_patientId_idx" ON "ClinicalNote"("patientId");

-- CreateIndex
CREATE INDEX "Procedure_patientId_idx" ON "Procedure"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_patientId_idx" ON "Invoice"("patientId");

-- CreateIndex
CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
