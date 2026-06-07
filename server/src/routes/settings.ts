import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

async function getOrCreate(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({ data: { userId } });
}

router.get(
  "/",
  requireAuth,
  wrap(async (req, res) => {
    const s = await getOrCreate(req.user!.sub);
    res.json(s);
  })
);

const updateSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  density: z.enum(["compact", "regular", "comfy"]).optional(),
  fontPair: z.enum(["default", "jakarta", "inter"]).optional(),
  showSideCards: z.boolean().optional(),
});

router.put(
  "/",
  requireAuth,
  validate(updateSchema),
  wrap(async (req, res) => {
    const data = req.body as z.infer<typeof updateSchema>;
    await getOrCreate(req.user!.sub);
    const updated = await prisma.userSettings.update({
      where: { userId: req.user!.sub },
      data,
    });
    res.json(updated);
  })
);

export default router;
