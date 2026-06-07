import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { serializeUser } from "../lib/serialize";
import { HttpError } from "../middleware/error";

const router = Router();

// All staff management is doctor (owner) only.
router.use(requireAuth, requireRole("DOCTOR"));

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR"
  );
}

router.get(
  "/",
  wrap(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(serializeUser));
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["DOCTOR", "RECEPTIONIST"]),
});

router.post(
  "/",
  validate(createSchema),
  wrap(async (req, res) => {
    const { name, email, password, role } = req.body as z.infer<typeof createSchema>;
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) throw new HttpError(409, "A user with that email already exists");
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        role,
        initials: initialsOf(name),
        settings: { create: {} },
      },
    });
    res.status(201).json(serializeUser(user));
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["DOCTOR", "RECEPTIONIST"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.patch(
  "/:id",
  validate(updateSchema),
  wrap(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      data.name = body.name;
      data.initials = initialsOf(body.name);
    }
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.password !== undefined) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(serializeUser(user));
  })
);

// Soft-disable rather than hard delete (keeps history intact).
router.delete(
  "/:id",
  wrap(async (req, res) => {
    if (req.params.id === req.user!.sub) throw new HttpError(400, "You can't deactivate your own account");
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json(serializeUser(user));
  })
);

export default router;
