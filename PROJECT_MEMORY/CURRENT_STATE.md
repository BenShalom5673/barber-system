# CURRENT STATE — Barber System

_Last updated: 2026-04-26 (audited against codebase)_

---

## What Already Exists in the Code

### Database (fully built)
- All database tables are defined and migrations exist (0000, 0001, 0002).
- Complete table list is in PROJECT_MASTER.md.
- GiST exclusion constraint is active — double-booking is impossible at the database level.
- Migration 0002 (`price_is_starting` column on services) — **status unknown**. The file exists but whether it has been applied to the live database is not confirmed. Run `npm run db:migrate` to be safe.

### Backend APIs

**Public (no token required):**
- `GET /api/services` — returns all active services for the barbershop
- `GET /api/services/[id]` — returns a single service by ID
- `GET /api/staff?serviceId=...` — returns barbers who can perform a given service
- `GET /api/availability?barbershopId=...&serviceId=...&date=...&staffProfileId=...` — returns available time slots

**Protected (require `x-internal-token` header):**
- `POST /api/bookings` — creates an appointment ⚠️ this token check BLOCKS the public booking wizard — see Known Bugs
- `POST /api/services` — creates a new service
- `PATCH /api/staff/[id]` — updates a staff member's profile
- `DELETE /api/staff/[id]` — deactivates a staff member (soft-delete)
- `PUT /api/staff/[id]/schedule/weekly` — replaces a staff member's full weekly schedule
- `POST /api/staff` — creates a new staff member
- `GET /api/settings/operational` — returns booking settings
- `PUT /api/settings/operational` — saves booking settings
- `GET /api/settings/business-profile` — returns business profile
- `PATCH /api/settings/business-profile` — updates business profile
- `GET /api/settings/no-show-policy` — returns no-show charge rules
- `PUT /api/settings/no-show-policy` — replaces no-show policy
- `GET /api/settings/onboarding-status` — returns completion checklist

### Availability Engine (fully built)
- Reads working hours per barber per day.
- Reads existing appointments and blocked slots.
- Generates time slot candidates on a fixed grid (interval from `barbershopSettings.slotIntervalMinutes`, default 15 if a settings row exists, or 5 if no settings row).
- Injects extra gap-start candidates from the exact end of each existing appointment, propagating forward in service-duration steps, keeping only 5-minute-aligned times.
- Filters out any slot that would overlap an existing appointment (including buffer time).
- Returns three modes: `specific_staff`, `single_staff`, `multi_staff`.

### Booking Engine (fully built)
- Validates: customer status, service exists, staff exists, staff can perform service, slot is still available.
- Creates customer record if first booking (matched by phone number).
- Snapshots price, duration, and service name at booking time.
- Resolves deposit requirements.
- Handles race conditions via DB constraint (returns 409 if slot was taken just before insert).

### Booking Wizard UI (mostly built)
- Step 1 — **Service selection**: working. Lists all active services with price and duration. Only passes `serviceId` back — service name and price are NOT stored in wizard state yet.
- Step 2 — **Staff selection**: working. Shows barbers who offer the chosen service.
- Step 3 — **Date & time selection**: working. Date input + time slots fetched from API.
- Step 4 — **Customer details**: working. Name (required), phone (required), optional email + birthday, marketing consent checkbox.
- Step 5 — **Confirm step**: UI exists and shows a summary, BUT it receives `data={}` (empty) from the wizard and the confirm button is not wired to the API.

### Test / Dev Data
- `scripts/seed-dev.ts` populates the dev database with test staff (בן, דוד, יוסי), test services, test working hours, and 8 test appointments.
- Seed marker: `⚠️ dev-seed` — all seed rows carry this so they can be wiped cleanly.
- Two test dates are seeded:
  - `2026-04-27` (Monday): 7 appointments including a gap-test case for דוד (gap at 11:25–11:55).
  - `2026-04-28` (Tuesday): 1 appointment for דוד ending at 12:25 — tests gap-propagation.
- Seed service `תספורת + זקן` has `durationMinutes: 25` (not 30 — important for verifying slot sequence).

---

## What Is Partially Done

- **ConfirmStep**: UI is complete but receives empty `data={}`. The confirm button has no handler.
- **BookingData in wizard**: Service name and price are not stored when the user picks a service — only `serviceId` is saved. This needs to be fixed before ConfirmStep can display the service name.
- **Debug logging**: `DateTimeStep.tsx` has **6 debug console.log/error calls** that should be removed: `INIT` (render), `EFFECT RUN`, `skipping fetch`, `fetching: url`, `response: JSON.stringify(res)`, and `fetch error`.

---

## What Is Missing

1. **Wire up the confirm button** — Call `POST /api/bookings` when the customer clicks "Confirm".
2. **Remove `guardInternalToken`** from `POST /api/bookings` — Blocks the public booking flow.
3. **Store service name + price in BookingData** — ServiceStep only passes `serviceId`; ConfirmStep needs the name and price to display the summary.
4. **Pass full BookingData to ConfirmStep** — service name, price, staff name, formatted date/time, customer details.
5. **Success screen** — After a booking is created, show a confirmation message.
6. **Real authentication** — Auth.js schema tables are defined but no auth routes or session handling exist. `DEV_BARBERSHOP_ID` is used everywhere.
7. **Payment integration** — Deposit logic exists in backend; no payment provider connected.
8. **Owner dashboard / calendar view** — No admin UI exists.
9. **Cancellation flow for customers** — `cancellation.service.ts` exists but no public API endpoint exposes it.

---

## Known Bugs

1. **`POST /api/bookings` returns 401** — `guardInternalToken()` check at the top of the route rejects all public requests. Must be removed before the wizard can complete a booking.

2. **ConfirmStep receives empty data** — `page.tsx` passes `data={}` to `ConfirmStep`. Will show dashes for all fields.

3. **Service name/price not in wizard state** — `ServiceStep` calls `onNext(serviceId)` only. The service's name and price are not carried forward into `BookingData`, so ConfirmStep cannot show them even after bug #2 is fixed.

4. **6 debug console.log statements in DateTimeStep** — Including one that serializes the full API response (`JSON.stringify(res)`) on every date selection. Should be removed.

---

## Risk Areas

1. **`slotIntervalMinutes` conflict**: The availability engine falls back to `DEFAULT_SLOT_INTERVAL_MINUTES = 5` only when NO barbershop settings row exists. If a settings row exists (created via `PUT /api/settings/operational`), it uses `barbershopSettings.slotIntervalMinutes` which defaults to **15** in the database schema. This means the fixed grid could run at 15-minute intervals, conflicting with the "5-minute resolution" product rule. The gap-based propagation still adds off-grid candidates, but the base grid would be at 15-minute density. The correct fix is to change the `slotIntervalMinutes` DB default and settings service default from 15 to 5.

2. **Migration 0002 status unknown** — If not applied, the `price_is_starting` column is missing from the services table and reads will fail.

3. **⚠️ Open product decision — Gap propagation step size**

   Current code steps by `serviceDurationMs` (duration only, no buffer):
   ```
   t += serviceDurationMs   // e.g. 25 min → candidates: T, T+25, T+50 …
   ```
   The alternative is stepping by `slotBlockMs` (duration + buffer):
   ```
   t += slotBlockMs         // e.g. 30 min → candidates: T, T+30, T+60 …
   ```

   **Case for `serviceDuration` step (current):** More candidates generated. Ones that conflict are eliminated by the overlap filter. Maximises options shown to the customer.

   **Case for `blockDuration` step:** Each candidate is exactly one block apart — matching the minimum real gap between two back-to-back bookings. More predictable. Avoids generating candidates that will always fail the overlap check.

   **Status: undecided. Do not change code until a product decision is made.**

---

## Next Recommended Steps (in order)

1. Remove `guardInternalToken` from `POST /api/bookings`.
2. Update `ServiceStep` to pass the full service object (name, price, priceIsStarting) into `BookingData`, not just the ID.
3. Pass complete `BookingData` to `ConfirmStep` in `page.tsx`.
4. Add `onConfirm` handler in `page.tsx` that calls `POST /api/bookings`.
5. Show a success screen after booking is confirmed.
6. Remove 6 debug console.log statements from `DateTimeStep.tsx`.
7. Fix `slotIntervalMinutes` default — change from 15 to 5 in the settings service and consider a migration.
8. Run `npm run db:migrate` to confirm migration 0002 is applied.
