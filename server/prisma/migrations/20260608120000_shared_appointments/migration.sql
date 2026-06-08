-- Replace the dashboard's old patient-linked appointment storage with the
-- table shared with the public clinic website. Written idempotently so it is
-- a no-op against the live shared DB (where `appointments` + its indexes
-- already exist) yet still builds the table on a fresh database / shadow DB.

-- 1) Drop the old, standalone patient-linked appointment storage.
DROP TABLE IF EXISTS "Appointment";
DROP TYPE IF EXISTS "AppointmentStatus";

-- 2) Adopt the website's shared `appointments` table (created by the website
--    project). CREATE ... IF NOT EXISTS so this is a no-op in environments
--    where the website already provisioned it.
CREATE TABLE IF NOT EXISTS "appointments" (
  "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "full_name"        TEXT        NOT NULL,
  "contact_number"   TEXT        NOT NULL,
  "email"            TEXT,
  "reason"           TEXT,
  "appointment_date" DATE        NOT NULL,
  "appointment_time" TEXT        NOT NULL,
  "status"           TEXT        NOT NULL DEFAULT 'pending',
  "source"           TEXT        NOT NULL DEFAULT 'website',
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments" ("appointment_date");
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments" ("status");

-- Partial unique index: a given date+slot can only be booked once among
-- non-cancelled appointments. Already present in the live shared DB; kept here
-- so fresh/shadow databases enforce the same integrity. Prisma does not model
-- partial indexes, so it leaves this object untouched on future migrations.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_slot"
  ON "appointments" ("appointment_date", "appointment_time")
  WHERE "status" <> 'cancelled';
