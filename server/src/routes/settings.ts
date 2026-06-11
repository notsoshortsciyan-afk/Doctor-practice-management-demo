import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  wrap(async (req, res) => {
    // Upsert = one round trip whether or not the row exists yet.
    const s = await prisma.userSettings.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub },
      update: {},
    });
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
    const updated = await prisma.userSettings.upsert({
      where: { userId: req.user!.sub },
      create: { userId: req.user!.sub, ...data },
      update: data,
    });
    res.json(updated);
  })
);

// ── Clinic-wide settings (single row) ───────────────────────
const CLINIC_ID = "singleton";

// GET /api/settings/clinic — readable by any signed-in staff (both roles use it
// on the Schedule "full" threshold).
router.get(
  "/clinic",
  requireAuth,
  wrap(async (_req, res) => {
    const s = await prisma.clinicSettings.upsert({
      where: { id: CLINIC_ID },
      create: { id: CLINIC_ID },
      update: {},
    });
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
    const updated = await prisma.clinicSettings.upsert({
      where: { id: CLINIC_ID },
      create: { id: CLINIC_ID, slotFullAt: data.slotFullAt },
      update: { slotFullAt: data.slotFullAt },
    });
    res.json({ slotFullAt: updated.slotFullAt });
  })
);

export default router;
