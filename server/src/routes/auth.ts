import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword, signToken } from "../lib/auth";
import { validate, wrap } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serialize";
import { HttpError } from "../middleware/error";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  validate(loginSchema),
  wrap(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) throw new HttpError(401, "Invalid email or password");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid email or password");

    const token = signToken({
      sub: user.id,
      role: user.role,
      name: user.name,
      initials: user.initials,
    });
    res.json({ token, user: serializeUser(user) });
  })
);

router.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(401, "Session user not found");
    res.json({ user: serializeUser(user) });
  })
);

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
