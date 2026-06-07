import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

// Required — no insecure fallback. Throws at startup if unset (typed as string so the
// signing helpers below don't see `string | undefined`).
const JWT_SECRET: string =
  process.env.JWT_SECRET ??
  (() => {
    throw new Error(
      "JWT_SECRET is not set. Set it in server/.env locally and in the Vercel project's environment variables.",
    );
  })();

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  name: string;
  initials: string;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
