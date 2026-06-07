import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { serializeNote } from "../lib/serialize";

const router = Router();
router.use(requireAuth);

// Clinical notes are doctor-only.
router.get(
  "/",
  requireRole("DOCTOR"),
  wrap(async (req, res) => {
    const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
    const notes = await prisma.clinicalNote.findMany({
      where: patientId ? { patientId } : {},
      orderBy: { date: "desc" },
    });
    res.json(notes.map(serializeNote));
  })
);

const createSchema = z.object({
  patientId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  verified: z.boolean().optional(),
  italic: z.boolean().optional(),
});

router.post(
  "/",
  requireRole("DOCTOR"),
  validate(createSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof createSchema>;
    const note = await prisma.clinicalNote.create({
      data: {
        patientId: b.patientId,
        authorId: req.user!.sub,
        title: b.title,
        body: b.body,
        verified: b.verified ?? false,
        italic: b.italic ?? false,
      },
    });
    res.status(201).json(serializeNote(note));
  })
);

export default router;
