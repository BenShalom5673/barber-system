# PROJECT MASTER — Barber System

_Last updated: 2026-04-26 (audited against codebase)_

---

## What This System Is

An online booking system for a barbershop (Israel-based). Customers visit a webpage, pick a service, choose a barber, select a date and time, fill in their contact details, and confirm the appointment. The barbershop owner can see and manage all bookings.

---

## Main Goals

1. Let customers book appointments online, 24/7, without calling.
2. Prevent double-booking automatically (two customers cannot get the same barber at the same time).
3. Maximize the barber's calendar — no wasted gaps between appointments.
4. Collect customer contact info (name, phone, optional email + birthday) at booking time.
5. Support multiple barbers working at the same location.
6. Eventually support deposits and online payments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| UI Library | React 19.2.4 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Internationalization | next-intl 4 (Hebrew + English, Hebrew is primary) |
| Backend | Next.js API Routes (server-side) |
| Database | PostgreSQL (hosted on Neon serverless) |
| ORM | Drizzle ORM |
| Language | TypeScript 5 (strict mode — see Code Rules) |
| Timezone | All barbershop times are in **Asia/Jerusalem** (UTC+2 winter / UTC+3 summer) |
| Currency | Israeli Shekel — prices are stored in **agorot** (1 shekel = 100 agorot) |
| Locale | Hebrew (RTL) is the primary UI language |

---

## Core Business Rules

### Appointments
- Each appointment belongs to: one barbershop, one customer, one staff member, one service.
- A booked slot is stored as a **time range** `[start, end)` in UTC. The `end` = start + service duration + buffer.
- The database enforces that the **same barber cannot have two overlapping slots** (GiST exclusion constraint).
- Appointment statuses: `confirmed`, `pending_deposit`, `cancelled`, `no_show`, `completed`.
- Price, duration, and service name are **snapshot-copied at booking time** — changes to the service later do not affect past bookings.

### Time Slots
- All customer-facing appointment times must be on **5-minute increments** (e.g. 12:00, 12:05, 12:25 — never 12:03).
- All service durations are also configured in 5-minute increments.
- **Buffer time** (default: 5 minutes, configurable per barbershop) is added after every appointment. This is invisible to customers but prevents back-to-back bookings with no gap.
- Slot scheduling is **gap-based**: after any existing appointment ends, new slots can start exactly at that end time (not rounded to an arbitrary grid).
- ⚠️ See Risk Areas in CURRENT_STATE.md regarding the `slotIntervalMinutes` default conflict.

### Staff
- Each barbershop can have multiple staff members.
- Each staff member has a weekly schedule stored in the database.
- A staff member can be assigned to specific services, or if they have no assignments at all, they can perform all services.
- Staff eligibility rule: if a staff member has ANY service assignments, they must have a specific assignment for the requested service to appear available.

### Customers
- Customers are identified by **phone number** (E.164 format), unique per barbershop.
- If a customer with the same phone books again, the system reuses the existing customer record.
- Customer statuses: `active`, `restricted` (blocked from online booking), `irrelevant` (blocked entirely), `vacation`.
- No-show tracking: each customer has a `noShowCount` and `depositRequired` flag that can be set automatically by policy or manually by the owner.

### Deposits
- Deposits can be required per service, per barbershop policy, or per customer (e.g. repeat no-shows).
- Deposit can be a fixed amount (agorot) or a percentage of the service price.
- Not yet active in the booking flow (payment integration not built yet).

---

## Current Architecture

```
src/
  app/
    [locale]/
      page.tsx              ← Home/landing page
      layout.tsx            ← Layout with locale provider
      book/
        page.tsx            ← The public booking wizard (customer-facing)
    api/
      availability/         ← GET: returns open time slots
      bookings/             ← POST: creates an appointment (blocked by internal token — see bugs)
      services/             ← GET: lists services, POST: creates service (protected)
      services/[id]/        ← GET: single service
      staff/                ← GET: lists barbers by service, POST: creates staff (protected)
      staff/[id]/           ← PATCH: update staff, DELETE: deactivate staff (protected)
      staff/[id]/schedule/weekly/ ← PUT: replace weekly schedule (protected)
      settings/
        business-profile/   ← GET/PATCH: business identity
        no-show-policy/     ← GET/PUT: no-show charge rules
        operational/        ← GET/PUT: booking settings (buffer, horizon, slot interval)
        onboarding-status/  ← GET: completion checklist
  components/booking/
    ServiceStep.tsx         ← Step 1: pick a service
    StaffStep.tsx           ← Step 2: pick a barber
    DateTimeStep.tsx        ← Step 3: pick a date and time slot
    CustomerStep.tsx        ← Step 4: enter name, phone, optional email/birthday
    ConfirmStep.tsx         ← Step 5: review and confirm (not yet wired to API)
  i18n/
    messages/he.json        ← Hebrew translations
    messages/en.json        ← English translations
    routing.ts              ← next-intl locale routing config
    request.ts              ← next-intl server request config
  middleware.ts             ← next-intl routing middleware
  server/
    db/
      schema/               ← Database table definitions (see Database section)
      migrations/           ← SQL migrations (0000, 0001, 0002)
    repositories/           ← Database read/write functions (one file per table group)
    services/               ← Business logic (availability, booking, cancellation, etc.)
    lib/route-utils.ts      ← Shared helpers for API routes (auth guard, error mapping)
    errors/domain.ts        ← All custom error types
  lib/
    slot-utils.ts           ← Pure time/slot math (no database access)
scripts/
  seed-dev.ts               ← Fills the dev database with test barbers, services, and appointments
```

---

## Database Tables (complete list)

| Table | Purpose |
|---|---|
| `barbershops` | One row per barbershop. Has a `timezone` column (defaults to Asia/Jerusalem, not yet used in logic). |
| `users` | Auth.js v5 user accounts (schema defined, auth not yet wired into routes) |
| `accounts` | Auth.js OAuth provider accounts |
| `sessions` | Auth.js sessions |
| `verification_tokens` | Auth.js email verification |
| `barbershop_memberships` | Links users to barbershops with a role (owner/staff) |
| `staff_profiles` | Barber profiles. Can exist before account creation (placeholder). |
| `staff_services` | Which services each barber can perform |
| `staff_working_hours` | Weekly schedule per barber (day + start/end times) |
| `staff_schedule_overrides` | One-off day_off, custom_hours, or blocked_slot entries |
| `services` | Services offered (haircut, beard, colour, etc.) |
| `customers` | Customer records, matched by phone number |
| `appointments` | Booked appointments with tstzrange slot |
| `barbershop_settings` | Booking rules: buffer, horizon, slot interval, deposit policy |
| `business_profiles` | Legal/financial identity (VAT, registration number) |
| `no_show_policies` | Per-offense charge rules (0%, 50%, 100%) |
| `notification_settings` | Per-channel config (WhatsApp, SMS, email enabled/disabled) |
| `notifications` | Individual notification records and delivery status |
| `color_requests` | Hair colour consultation intake forms |
| `academy_leads` | Barbering academy enrollment leads |

---

## Product Principles

These principles override UX decisions when conflicts arise.

**Core Philosophy: Complex behind the scenes. Simple for the user.**

| Rule | Statement |
|---|---|
| UX #1 | The user should not think. The system thinks for them. |
| UX #2 | Fewer choices → higher conversion. |
| UX #3 | The system leads, not asks. Don't ask "What time do you want?" — present "The earliest available appointment is…" |
| UX #4 | Every action must be clear, fast, and ideally one click. |
| UX #5 | The user sees only what they need. Everything else happens behind the scenes. |

**Goal:** Build a system that feels smart, fast, and natural — not complex, heavy, or technical.

---

## Future Vision — Booking UX (not yet implemented)

The current wizard follows a fixed 5-step flow: service → staff → date/time → customer details → confirm.

The desired final product experience is a smarter 3-step flow:

**Step 1 — Choose Service**

**Step 2 — Smart Booking (default) or Manual Selection (fallback)**
- Smart Booking presents the closest available appointment and 3–5 ranked alternatives. The system leads; the customer confirms.
- Manual Selection lets the customer choose a specific barber, date, and time (current behavior).

Smart slot ranking criteria:
1. Earliest availability
2. Gap-filling (prefer slots that close existing calendar gaps)
3. Workload balancing across staff
4. Owner-controlled staff priority weighting

**Step 3 — Confirm Booking**

Business goals: increase booking conversion, reduce calendar gaps, give the owner better control over how workload is distributed.

_This requires backend changes (multi-staff slot scoring), a new Smart Booking UI component, and owner-facing priority controls. It is a significant future milestone, not part of current work._

---

## Future Architecture (not yet implemented)

### Buffer Configuration System

Currently the buffer is a single global value (`appointmentBufferMinutes` in `barbershop_settings`, default 5 minutes). The future system will support per-service and per-staff overrides.

**Priority order (highest wins):**

| Level | Description | Example |
|---|---|---|
| 1. Staff-service override | Buffer for a specific staff + service combination | דוד doing colour needs 10 min, others need 5 |
| 2. Staff override | Buffer for all services by a specific staff member | דוד always needs 8 min between appointments |
| 3. Service override | Buffer for a specific service regardless of staff | Colour treatments always need 10 min cleanup |
| 4. Global (current) | Barbershop-wide default | 5 minutes for everything |

**Rules:**
- If a more specific override exists, it overrides all lower levels.
- If no override exists at any level, the global value is used.
- All buffer values must be multiples of 5 minutes (consistent with the 5-minute alignment rule).
- The buffer remains invisible to customers at all levels — it is always internal only.

_Requires: new DB columns or a separate `buffer_overrides` table, updates to the availability engine's `bufferMinutes` resolution logic, and owner-facing configuration UI._

---

## Key Design Decisions

- **Gap-based scheduling + 5-minute alignment**: Slots come from a fixed grid PLUS candidates injected at the exact end of each existing appointment, propagated in service-duration steps. Only 5-min-aligned times are shown to customers.
- **Database double-booking protection**: PostgreSQL GiST exclusion constraint prevents overlapping slots for the same barber even in race conditions.
- **Snapshot pricing**: Price, duration, and service name are copied into the appointment at booking time and never updated.
- **No real auth yet**: `DEV_BARBERSHOP_ID` in `.env.local` identifies the barbershop. Auth.js schema tables are defined but not wired into routes.
- **Prices in agorot**: Integer storage avoids floating-point errors. Divide by 100 to display.
- **Timezone hardcoded**: `barbershops.timezone` column exists but the availability engine uses a hardcoded `DEFAULT_TIMEZONE = 'Asia/Jerusalem'`. Per-barbershop timezone is not implemented yet.
- **API protection pattern**: Customer-facing routes (GET services, GET staff, GET availability, POST bookings) require no token. Admin routes require the `x-internal-token` header via `guardInternalToken()`.
