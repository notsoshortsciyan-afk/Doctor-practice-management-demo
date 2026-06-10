import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";

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

// ── Clinic-wide settings (single row) ───────────────────────
const CLINIC_ID = "singleton";

async function getOrCreateClinic() {
  const existing = await prisma.clinicSettings.findUnique({ where: { id: CLINIC_ID } });
  if (existing) return existing;
  return prisma.clinicSettings.create({ data: { id: CLINIC_ID } });
}

// GET /api/settings/clinic — readable by any signed-in staff (both roles use it
// on the Schedule "full" threshold).
router.get(
  "/clinic",
  requireAuth,
  wrap(async (_req, res) => {
    const s = await getOrCreateClinic();
    res.json({ slotFullAt: s.slotFullAt });
  })
);

const clinicSchema = z.object({
  slotFullAt: z.number().int().min(1).max(50),
});

// PUT /api/settings/clinic — doctor-only; sets the booking count at which a slot
// is flagged "full".
router.put(
  "/clinic",
  requireAuth,
  requireRole("DOCTOR"),
  validate(clinicSchema),
  wrap(async (req, res) => {
    const data = req.body as z.infer<typeof clinicSchema>;
    await getOrCreateClinic();
    const updated = await prisma.clinicSettings.update({
      where: { id: CLINIC_ID },
      data: { slotFullAt: data.slotFullAt },
    });
    res.json({ slotFullAt: updated.slotFullAt });
  })
);

export default router;
