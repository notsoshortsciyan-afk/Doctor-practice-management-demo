import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Wipes ALL patient data but keeps (and guarantees) the two demo logins,
// so the doctor starts from an empty practice without losing access.
async function main() {
  console.log("Clearing patient data…");
  // FK-safe order: children before parents. Users + settings are left intact.
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.document.deleteMany();
  // NOTE: `appointments` is shared with the public website (live customer bookings) —
  // intentionally NOT cleared here.
  await prisma.patient.deleteMany();

  // Ensure both demo logins exist (idempotent — works even on a blank DB).
  console.log("Ensuring demo logins…");
  await prisma.user.upsert({
    where: { email: "doctor@dentalcare.test" },
    update: {},
    create: {
      name: "Dr. Md. Ashraf Ullah",
      email: "doctor@dentalcare.test",
      passwordHash: await bcrypt.hash("doctor123", 10),
      role: "DOCTOR",
      initials: "DR",
      settings: { create: {} },
    },
  });
  await prisma.user.upsert({
    where: { email: "reception@dentalcare.test" },
    update: {},
    create: {
      name: "Reception Desk",
      email: "reception@dentalcare.test",
      passwordHash: await bcrypt.hash("reception123", 10),
      role: "RECEPTIONIST",
      initials: "RD",
      settings: { create: {} },
    },
  });

  const [users, patients, invoices] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
    prisma.invoice.count(),
  ]);
  console.log("Reset complete:", { users, patients, invoices });
  console.log("Demo logins: doctor@dentalcare.test / doctor123 · reception@dentalcare.test / reception123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
