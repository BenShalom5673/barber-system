# Project Context — Barber Booking System

_Last updated: 2026-04-26 (audited)_

---

## What This Project Is

An online appointment booking system for an Israeli barbershop. Customers visit a webpage, choose a service, choose a barber, pick a date and time, enter their details, and confirm. Built with Next.js 16, React 19, TypeScript, PostgreSQL, and Drizzle ORM. UI is in Hebrew (right-to-left). Prices are stored in agorot (1 shekel = 100 agorot). Timezone is Asia/Jerusalem.

---

## What Already Exists

- Full database schema: barbershops, staff, services, customers, appointments, working hours, schedule overrides, settings, notifications, business profile, no-show policy, and more.
- Auth.js schema tables (users, accounts, sessions) are defined but authentication is not wired in yet.
- Double-booking prevention via a PostgreSQL GiST constraint.
- Availability engine: calculates open time slots per barber per day, with gap-based scheduling and 5-minute alignment.
- Complete booking backend: validates customer, service, staff, slot availability, then creates the appointment.
- 5-step booking wizard UI:
  1. Service selection — working (but only passes serviceId forward, not the name/price)
  2. Staff selection — working
  3. Date & time selection — working (fetches real slots from API)
  4. Customer details — working (name, phone, optional email/birthday)
  5. Confirm step — UI exists but receives empty data and the confirm button does nothing

---

## Current Task

Complete the booking flow so a customer can actually finish booking an appointment.

Focus strictly on completing the existing 5-step booking wizard before implementing any future UX improvements.

Four things are needed (in order):
1. Remove the internal token check from `POST /api/bookings` — it currently rejects all public requests with 401.
2. Pass service name and price forward from Step 1 into the wizard state.
3. Pass the full booking data into the Confirm step so it shows real information.
4. Add an `onConfirm` handler that calls `POST /api/bookings` and shows a success screen.

---

## Important Rules (Do Not Break These)

- All customer-facing times must be on **5-minute increments** (12:00, 12:25, 12:50 — never 12:03).
- All service durations are multiples of 5 minutes.
- A **5-minute buffer** after every appointment is stored in the database but never shown to customers.
- Slot time ranges stored as `[start, start + duration + buffer)` — half-open intervals.
- Prices are always integers in **agorot**. Divide by 100 to display in shekels.
- Customer phone number is the unique identifier — same phone = same customer record.
- TypeScript is strict: `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are enabled.
- Timezone is `Asia/Jerusalem` everywhere (hardcoded — the DB column exists but isn't used yet).
- Public customer-facing routes must NOT have the `guardInternalToken` check.

---

## Files That Must Not Be Broken

| File | Why it matters |
|---|---|
| `src/server/services/availability.service.ts` | Core slot calculation logic |
| `src/server/services/booking.service.ts` | Core booking + validation logic |
| `src/lib/slot-utils.ts` | Pure time math shared by availability engine |
| `src/server/db/schema/` (all files) | Database structure — changes require migrations |
| `src/server/db/migrations/` (all files) | Migration history — never edit or delete |
| `src/server/lib/route-utils.ts` | Shared API helpers used by all routes |
| `src/server/errors/domain.ts` | All custom error types used across the system |

---

## Known Bugs to Fix

1. `POST /api/bookings` — `guardInternalToken()` at line 34 blocks all customer requests → remove it.
2. `ConfirmStep` in `page.tsx` receives `data={}` → pass full `BookingData`.
3. `ServiceStep` only calls `onNext(serviceId)` → also pass service name and price.
4. 6 debug `console.log` calls remain in `DateTimeStep.tsx` → remove them.

## Known Risk

`slotIntervalMinutes` defaults to 15 in the database and settings service, but the product rule requires 5. When a barbershop settings row exists, the fixed slot grid runs at 15-minute density (gap-based candidates still fill finer times, but this should be corrected).
