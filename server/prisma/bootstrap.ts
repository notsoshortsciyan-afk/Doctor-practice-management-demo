import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Non-destructive bootstrap: guarantees the two login accounts exist so the app is
// always reachable, and NOTHING else. It deletes nothing and creates zero patients
// or clinical data — so it is safe to run automatically after every `prisma migrate
// dev` / `prisma migrate reset` (wired via the "prisma.seed" config in package.json)
// even once the practice holds real patient data. There is intentionally no demo
// dataset: dummy data must never be (re)created. To clear test data, use the in-app
// "Delete all patient data" button (Settings → Account) or the `reset-empty` script.
async function main() {
  console.log("Ensuring login accounts exist…");
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

  const [users, patients] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
  ]);
  console.log("Bootstrap complete:", { users, patients });
  console.log("Logins: doctor@dentalcare.test / doctor123 · reception@dentalcare.test / reception123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
