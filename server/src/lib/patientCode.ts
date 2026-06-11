import { Prisma } from "@prisma/client";

// Create a patient with a fresh human-facing "DC-#####" code in ONE round trip:
// try a random code and retry on the (vanishingly rare) unique-constraint clash,
// instead of pre-checking with a findUnique. The caller supplies the create call
// so includes/selects keep their exact Prisma result types.
export async function createPatientWithCode<R>(create: (code: string) => Promise<R>): Promise<R> {
  for (let i = 0; i < 3; i++) {
    try {
      return await create(`DC-${10000 + Math.floor(Math.random() * 89999)}`);
    } catch (e) {
      // P2002 = unique violation; Patient's only other unique field is the id,
      // so a clash here can only be the code — roll a new one.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return create(`DC-${Date.now().toString().slice(-5)}`);
}
