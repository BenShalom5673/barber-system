# NEXT TASKS — Barber System

_Last updated: 2026-04-26 (audited and reordered)_

Tasks are ordered by priority. Complete them from the top.

---

## 1. Remove the booking lock (URGENT — booking does not work yet)

**What to do:** Remove the `guardInternalToken` check from `POST /api/bookings`.

**Why:** When a customer clicks "Confirm Booking", the server rejects the request with an "Unauthorized" error. This guard was added as a placeholder before real login was built. Customers should be able to book without a token.

**File:** `src/app/api/bookings/route.ts` — delete lines 34–35 (the `guardInternalToken` call and its early return).

---

## 2. Store service name and price in the booking wizard state

**What to do:** When the customer selects a service (Step 1), save not just the `serviceId` but also the service `name`, `priceAgorot`, and `priceIsStarting` into the `BookingData` state in `page.tsx`.

**Why:** Right now `ServiceStep` only calls `onNext(serviceId)`. The service name and price are lost after step 1. The Confirm step needs them to show the customer what they are booking and how much it costs.

**Files:**
- `src/app/[locale]/book/page.tsx` — extend `BookingData` to include `serviceName`, `servicePrice`, `servicePriceIsStarting`; update `handleServiceNext` to receive and store those fields.
- `src/components/booking/ServiceStep.tsx` — update `onNext` callback to pass the full service object (not just the ID).

---

## 3. Pass real data into the Confirm step

**What to do:** In `page.tsx`, replace the empty `data={}` passed to `ConfirmStep` with the actual `BookingData` object.

**Why:** ConfirmStep currently shows dashes for all fields — the customer sees nothing before confirming.

**File:** `src/app/[locale]/book/page.tsx` — update the `ConfirmStep` line in the `content` array.

Note: ConfirmStep's existing interface uses `date` and `time` as separate fields. The wizard stores `slotStart` (a full ISO string). The `page.tsx` will need to split `slotStart` into a display date and display time before passing to ConfirmStep, or ConfirmStep should be updated to accept `slotStart` directly.

---

## 4. Wire the Confirm button to the booking API

**What to do:** Add an `onConfirm` function in `page.tsx` that sends a `POST` request to `/api/bookings`, then connect it to `ConfirmStep`.

**Why:** The confirm button currently has no `onClick` handler. This is the core action of the entire wizard.

**What to send in the POST body:**
```json
{
  "staffProfileId": "...",
  "serviceId": "...",
  "start": "2026-04-27T12:25:00+03:00",
  "customerName": "...",
  "customerPhone": "050-0000000",
  "customerEmail": "..." (optional),
  "customerBirthDate": "YYYY-MM-DD" (optional)
}
```

**Files:**
- `src/app/[locale]/book/page.tsx` — add `handleConfirm` async function
- `src/components/booking/ConfirmStep.tsx` — accept `onConfirm: () => void` prop and wire it to the confirm button

---

## 5. Show a success screen after booking

**What to do:** After `POST /api/bookings` returns 201, show the customer a "booking confirmed" message with the appointment summary.

**Why:** The wizard has no final "done" state. After the API call succeeds, nothing visible changes.

**Approach:** Add a 6th step or replace the content with a success screen that shows service, barber, date, and time.

**File:** `src/app/[locale]/book/page.tsx` or a new `SuccessStep.tsx` component.

---

## 6. Remove 6 debug console.log statements from DateTimeStep

**What to do:** Delete all `console.log` and `console.error` debug calls from `DateTimeStep.tsx`.

**The 6 logs to remove:**
1. `[DateTimeStep] INIT` — in the component body (fires every render)
2. `[DateTimeStep] EFFECT RUN` — at the top of the useEffect
3. `[DateTimeStep] skipping fetch — missing:` — inside the effect guard
4. `[DateTimeStep] fetching: url` — before the fetch call
5. `[DateTimeStep] response: JSON.stringify(res)` — in the fetch success callback
6. `[DateTimeStep] fetch error:` — in the catch block

**File:** `src/components/booking/DateTimeStep.tsx`

---

## 7. Fix the slotIntervalMinutes default (from 15 to 5)

**What to do:** Change the `slotIntervalMinutes` default from 15 to 5 in two places:
1. `src/server/services/settings.service.ts` — the `saveOperationalSettings` function defaults it to 15 when creating a new settings row.
2. Consider a database migration to update the column default in `barbershop_settings`.

**Why:** RULES.md states the system must use 5-minute resolution. But the database default is 15, which means any barbershop with a settings row uses a 15-minute fixed grid. This contradicts the product rule.

---

## 8. Confirm migration 0002 is applied

**What to do:** Run `npm run db:migrate` in the terminal.

**Why:** Migration 0002 adds the `price_is_starting` column to the services table. If it has not been applied, the system may fail.

---

## Future (not yet started)

- **Owner dashboard / calendar** — No admin view exists. The owner cannot see upcoming appointments.
- **Customer cancellation** — Backend logic exists (`cancellation.service.ts`) but no public API endpoint or UI is exposed.
- **Real authentication** — Auth.js DB schema tables ARE defined (`users`, `accounts`, `sessions`, `verificationTokens`) but no auth routes, session handling, or login UI exist yet.
- **Payment / deposits** — Deposit logic is designed in the backend. No payment provider (e.g. Stripe, PayPlus) is connected.
- **SMS / WhatsApp reminders** — `notification_settings` and `notifications` tables exist. No sending logic built.
- **Per-barbershop timezone** — `barbershops.timezone` column exists but the availability engine ignores it and hardcodes `Asia/Jerusalem`.
- **Multiple barbershops** — Database supports many barbershops but the wizard is hardcoded to one via `DEV_BARBERSHOP_ID`.
- **Smart Booking UX** — Replace the current 5-step wizard with a 3-step flow: (1) Choose service, (2) Smart booking with ranked alternatives OR manual selection fallback, (3) Confirm. Smart ranking uses earliest slot, gap-filling, workload balancing, and owner-set staff priority. Requires: multi-staff slot scoring backend, new Smart Booking UI component, owner priority controls. See PROJECT_MASTER.md for full description.
