# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Ashraf's Dental Care** — a **full-stack** practice-management app for a solo dental chamber (one doctor + one or two receptionists). Frontend: Vite + React 18 + TypeScript SPA. Backend: Express + Prisma + PostgreSQL in [server/](server/). Auth is JWT-based with two roles (`DOCTOR` = owner, `RECEPTIONIST` = front desk). Deploy target is **Vercel** (static frontend + the Express app wrapped as a serverless function in [api/index.ts](api/index.ts)) with hosted Postgres (Neon).

This repo originated as a **handoff bundle from Claude Design** (claude.ai/design); the original prototypes live in `_design_source/` (gitignored). The visual design under `src/` is preserved pixel-for-pixel from those prototypes — when a visual detail is ambiguous, the source of truth is `_design_source/project/`. (The earlier mock-data generator in `src/data.ts` has been **removed** — there is intentionally no dummy/demo dataset; `src/data.ts` now only supplies static option lists like `TESTS`.)

## Commands

```bash
# First-time setup
cp server/.env.example server/.env   # then set DATABASE_URL (Neon Postgres) + JWT_SECRET
npm install                          # npm workspace: installs root + server/ deps in one go
npm run db:migrate                   # prisma migrate dev (creates tables)
npm run db:seed                      # bootstrap: ensures the two login accounts exist (NO dummy patients)

# Day to day
npm run dev        # runs BOTH: Vite (5173) + API (3001) via concurrently
npm run build      # tsc -b + vite build → dist/   (frontend correctness gate)
npm run typecheck  # frontend tsc -b --noEmit
npm run db:studio  # Prisma Studio (browse the DB)

# Server-only (run inside server/)
cd server && npm run typecheck   # backend tsc gate
```

Demo logins after seeding: `doctor@dentalcare.test / doctor123`, `reception@dentalcare.test / reception123`.

There is **no test runner, linter, or formatter** configured. The correctness gates are `npm run build`/`npm run typecheck` (frontend) and `cd server && npm run typecheck` (backend) — run both after changes.

## Deployment (Vercel)

This is an **npm workspace** (root + `server/`): a single root `npm install` installs and hoists the server's deps so Vercel can trace them when bundling the serverless function at [api/index.ts](api/index.ts). The `buildCommand` in [vercel.json](vercel.json) runs the chain explicitly (NOT via an `npm run` script — a script named `vercel-build` gets misrouted to the `server` workspace under npm workspaces; the same chain is mirrored in the root `build:vercel` script for manual runs):

```
prisma generate --schema server/prisma/schema.prisma   # regenerate client (incl. rhel-openssl-3.0.x engine for Lambda)
&& prisma migrate deploy --schema server/prisma/schema.prisma  # apply any new migrations to the prod DB
&& tsc -b && vite build                                # build the SPA → dist/
```

**Required Vercel environment variables** (Project → Settings → Environment Variables, for Production + Preview):
- `DATABASE_URL` — Neon **pooled** connection string.
- `JWT_SECRET` — long random string (no insecure fallback exists; the app throws at startup if it's unset).
- `NODE_ENV` — `production`.
- `CORS_ORIGIN` — *optional*; comma-separated origin allowlist (unset = allow all, fine for same-origin Vercel).

Secrets live only in `server/.env` (gitignored) and Vercel's dashboard — never commit them. Health check after deploy: `GET /api/health`.

## Architecture

**Routing is hash-based, hand-rolled — no router library.** `App.tsx` is the single source of truth:
- The `Route` union type lives in [src/types.ts](src/types.ts). `getRoute()` parses `location.hash`; a `hashchange` listener keeps `route` state in sync; `go(r)` sets the hash and state.
- `App` is wrapped in `QueryClientProvider` + `AuthProvider`. The `Gate` component shows `Login` when unauthenticated and `Shell` (the nav + screens) when authed.
- `App` switches on `route` to render one screen from `src/screens/`. All modules are implemented: `dashboard`, `directory`, `detail`, `entry`, `schedule`, `records`, `billing`, `settings`.
- **Role gating:** `NAV_ITEMS` and `ROUTE_ROLES` in `App.tsx` filter nav/screens by role; clinical routes (`entry`, `records`) are doctor-only. The server enforces the same boundaries (the real check) — never rely on the client guard alone.
- `detail` and `entry` are sub-routes of the "Patients" nav item (`navKey` logic).

**Data flows through the API via React Query**, not mock imports. `src/api/client.ts` is a `fetch` wrapper (attaches the JWT Bearer token, normalizes errors, fires `auth:unauthorized` on 401). `src/api/hooks.ts` holds all query/mutation hooks (`usePatients`, `usePatient`, `useAppointments`, `useCreatePrescription`, `useInvoices`, `useStats`, `useSettings`, `useUsers`, …). `src/api/types.ts` mirrors the server's serialized shapes. Auth lives in `src/auth/AuthContext.tsx`. Light cross-screen state (`selectedPatientId`, `directoryInitialQuery`, `showToast`, `go`) is still `useState` in `App.tsx`/`Shell`.

**Theming is persisted per user.** `Shell` reads `useSettings()` and writes `data-theme`/`data-dens`/`data-pair` to `<html>` (the CSS in [src/styles.css](src/styles.css) keys off those). The old floating Tweaks panel is removed; appearance now lives in the Settings screen and saves to the `UserSettings` table. **To restyle, edit CSS variables/selectors in styles.css.**

### Backend ([server/](server/))
- **Express app** is built in [server/src/app.ts](server/src/app.ts) (`createApp()`) and run two ways: locally via [server/src/index.ts](server/src/index.ts) (`app.listen`), and on Vercel via [api/index.ts](api/index.ts), which **exports the Express app directly** as the function's default export (Vercel invokes it as a Node `(req, res)` handler, which an Express app already is — do NOT wrap it in `serverless-http`, whose AWS `(event, context)` signature never finalizes Vercel's `res` and hangs every request until the 300s timeout). The `api/` dir carries its own [api/tsconfig.json](api/tsconfig.json) (CommonJS/Node, so `@vercel/node` compiles the function and the `server/` import graph the same way the local `server/tsconfig.json` does) and [api/package.json](api/package.json) (`{"type":"commonjs"}`, overriding the root's `"type":"module"` so Node runs the compiled CJS output as CommonJS). Vite proxies `/api` → `localhost:3001` in dev (see [vite.config.ts](vite.config.ts)).
- **Routes** in `server/src/routes/*` (auth, users, patients, appointments, prescriptions, notes, billing, stats, settings). **Middleware** in `server/src/middleware/*`: `requireAuth`, `requireRole(...)`, `validate(zodSchema)`, `errorHandler`. Zod validates every write.
- **Serializers** in [server/src/lib/serialize.ts](server/src/lib/serialize.ts) convert Prisma rows into the exact shapes the frontend expects (e.g. `status` → `{key, chip}`, derived `lastVisit`/`balance`; appointment rows → the shared-booking shape with `id` stringified from `BigInt`). Change these if you change an API response shape — keep them in sync with `src/api/types.ts`.
- **Schema** in [server/prisma/schema.prisma](server/prisma/schema.prisma). After editing it, run `npm run db:migrate`. Enum `PatientStatus` stores `FollowUp` but serializes to `"Follow-up"`.

**Appointments are a SHARED table with the public clinic website — not patient-linked.** The clinic's separate public website (its own repo) lets customers book online and INSERTs into a Postgres table named **`appointments`** that lives in the **same Neon database** this dashboard uses (one DB; `DATABASE_URL` points at it). The dashboard's Prisma `Appointment` model `@@map`s to that table ([schema.prisma](server/prisma/schema.prisma)): `BigInt` id, `appointment_date` (`@db.Date`), `appointment_time` as a **TEXT slot label** (e.g. `"04:30 PM"`), lowercase `status` (`pending|confirmed|cancelled`), and `source` (`website` | `manual` for front-desk entries | `lock` for staff slot-locks). **Do not change those column names/types — the website depends on them.** Bookings carry only a name + contact (no `patientId`), so patient cards no longer show a "next appointment" (`serializePatient` sets `nextAppt`/`apptTime`/`procedure` to `null` and derives `lastVisit` from the latest prescription). The fixed 10-slot/day system is the single source of truth in [server/src/lib/slots.ts](server/src/lib/slots.ts) (mirrored for the picker as `APPOINTMENT_SLOTS` in [src/data.ts](src/data.ts)) — it must stay identical to the website's slots. A partial unique index `uniq_active_slot (appointment_date, appointment_time) WHERE status <> 'cancelled'` enforces one active booking per slot DB-wide; [server/src/routes/appointments.ts](server/src/routes/appointments.ts) catches its violation (Postgres `23505` / Prisma `P2002`) → HTTP 409. `GET /api/appointments/availability?date=` reports per-slot `{ time, booked, locked, lockId }` for that day.

**Booking creation moved off the dashboard:** Schedule's "New Appointment" opens the public booking site (`https://drashraf.vercel.app/appointment`) in a new tab — the dashboard no longer has an inline create form (the `POST /api/appointments` manual-create route still exists but is unused by the UI). **Slot locks:** staff lock a slot from the Schedule tab via `POST /api/appointments/locks` `{date,time}` (and `DELETE /api/appointments/locks/:id`), which writes a sentinel row (`source='lock'`, `status='confirmed'`, placeholder name/contact). Being non-cancelled, the lock is honored by BOTH the website's availability query and `uniq_active_slot`, so the slot becomes unbookable on the public site **with no website code change**. Locks are filtered OUT of the bookings list (`source != 'lock'`) and the dashboard stats counts, and a `source='lock'` guard on the delete route ensures it can never remove a real booking.

CSS design tokens: [src/styles.css](src/styles.css) defines color/spacing/font tokens on `:root` and overrides them via `[data-theme="dark"]`, `[data-dens=…]`, `[data-pair=…]` selectors. **To restyle, edit CSS variables/selectors in styles.css; don't add per-component inline color values.** Fonts are loaded via Google Fonts `<link>` in [index.html](index.html). Print uses an `@media print` block that isolates `.rx-print-root` (the prescription/record) — `window.print()` from NewEntry/Records prints just the Rx.

**There is no dummy data — by design.** [server/prisma/bootstrap.ts](server/prisma/bootstrap.ts) is the Prisma `seed` (wired in [server/package.json](server/package.json)), so `prisma migrate dev` / `migrate reset` / `npm run db:seed` only **upsert the two login accounts** — they never create patients and never delete anything, making them safe to run against a DB holding real patient data. To clear test/patient data, use the DOCTOR-only "Delete all patient data" button in Settings → Account (backed by `POST /api/admin/wipe` in [server/src/routes/admin.ts](server/src/routes/admin.ts)) or the CLI escape hatch `npm run db:reset-empty` ([server/prisma/reset-empty.ts](server/prisma/reset-empty.ts)), which wipes patient/clinical tables but keeps the logins. Both keep `User`/`UserSettings` intact, and both **deliberately exclude the shared `appointments` table** (clearing it would destroy live website bookings).

**Icons are inline SVG React components** in [src/icons.tsx](src/icons.tsx) (`Icon*` exports taking `size`/`style`). Add new glyphs here rather than importing an icon library.

**Types:** API response shapes live in [src/api/types.ts](src/api/types.ts) (what screens consume). [src/types.ts](src/types.ts) holds frontend-only domain types (`EntryForm`, `Medicine`, `ToothSelection`/`ToothCondition`, `Route`). Reusable UI lives in `src/components/` (`Modal`, `PatientFormModal`, `PatientSearchSelect`).

### Key screens (all in `src/screens/`)
- `Dashboard.tsx` — real stats (`useStats`) + today's appointments (`useAppointments`); appointment status changes persist.
- `Directory.tsx` — server-side searched/filtered/paginated patient list (`usePatients`); "Add New Patient" opens `PatientFormModal`.
- `PatientDetail.tsx` — patient bundle (`usePatient`); clinical sections (history, procedures, notes) are doctor-only; "Edit Profile" + "Add Treatment Note" persist.
- `NewEntry.tsx` — live prescription generator; links/creates a patient and saves via `useCreatePrescription`, then prints. Uses the interactive `ToothChart`.
- `Schedule.tsx` — day view of the shared `appointments` table: website + front-desk bookings with a Website/Manual source badge, confirm/cancel/delete, and a status filter. **Booking creation is NOT done here** — "New Appointment" opens the public booking site in a new tab. Above the list, a **Lock Time Slots** grid (`useSlotAvailability` + `useLockSlot`/`useUnlockSlot`) lets staff lock/unlock individual slots so they can't be booked. `Records.tsx` / `Billing.tsx` / `Settings.tsx` — prescription archive, invoices+payments, and account/appearance/staff management.
- [src/ToothChart.tsx](src/ToothChart.tsx) — interactive odontogram using **FDI two-digit tooth numbering** grouped into four quadrants; selections are a `ToothSelection` map of tooth number → `ToothCondition` (`issue`/`caries`/`extract`).

## Conventions

- The design is **fixed-width desktop** (`<meta viewport width=1440>`); it is not responsive — match the prototype's 1440px canvas.
- Match the existing prototype visuals pixel-for-pixel; dimensions and colors are spelled out in `styles.css` and the `_design_source` files. You don't need to render in a browser to read them.
