import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import patientRoutes from "./routes/patients";
import appointmentRoutes from "./routes/appointments";
import prescriptionRoutes from "./routes/prescriptions";
import noteRoutes from "./routes/notes";
import billingRoutes from "./routes/billing";
import statsRoutes from "./routes/stats";
import settingsRoutes from "./routes/settings";
import adminRoutes from "./routes/admin";
import { notFound, errorHandler } from "./middleware/error";

export function createApp() {
  // Fail fast on a misconfigured deploy instead of silently serving broken auth/data.
  const missing = (["DATABASE_URL", "JWT_SECRET"] as const).filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them in server/.env locally and in the Vercel project's environment variables.",
    );
  }

  const app = express();

  // Gzip JSON responses — the Records archive (/prescriptions?limit=2000) is the
  // big one. No-op where the platform already compresses (skips encoded responses).
  app.use(compression());

  // Same-origin on Vercel (frontend + /api share a host), so CORS is not load-bearing there.
  // Set CORS_ORIGIN (comma-separated allowlist) to lock the API down to specific origins.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors(
      corsOrigin
        ? { origin: corsOrigin.split(",").map((o) => o.trim()), credentials: true }
        : undefined,
    ),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/patients", patientRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/prescriptions", prescriptionRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/admin", adminRoutes);

  // Unknown API route → JSON 404 (must be after all /api routers).
  app.use("/api", notFound);

  // Optional: single-server production (e.g. node deploy / Fly). On Vercel the static
  // frontend is served by the platform and this function only ever sees /api/*.
  const clientDir = process.env.CLIENT_DIST || path.resolve(__dirname, "../../dist");
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
