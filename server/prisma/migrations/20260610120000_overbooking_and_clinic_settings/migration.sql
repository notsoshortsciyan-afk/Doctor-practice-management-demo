-- Overbooking model: a website booking no longer reserves a slot. Bookings can
-- stack on the same (date, slot); only a staff LOCK (source='lock') makes the
-- slot unavailable. So the unique constraint now applies to LOCKS ONLY (one
-- active lock per slot) instead of every non-cancelled row.
DROP INDEX IF EXISTS "uniq_active_slot";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_lock"
  ON "appointments" ("appointment_date", "appointment_time")
  WHERE "source" = 'lock' AND "status" <> 'cancelled';

-- Clinic-wide settings (single row, id='singleton'). slotFullAt = booking count
-- at which the Schedule grid flags a slot as "full" (a manual lock nudge).
CREATE TABLE IF NOT EXISTS "ClinicSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "slotFullAt" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);
