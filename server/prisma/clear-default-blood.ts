import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-time maintenance: earlier versions auto-assigned "O+" to every patient
// (it was never an intentional entry). This nulls those out so blood group is
// blank unless explicitly set. Patients who genuinely are O+ can be re-entered
// via Edit Profile.
async function main() {
  const { count } = await prisma.patient.updateMany({
    where: { blood: "O+" },
    data: { blood: null },
  });
  console.log(`Cleared auto-assigned blood group on ${count} patient(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
