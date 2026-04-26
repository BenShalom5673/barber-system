# Current Project State — barber-system

## Last Updated
2026-04-26

## Current Phase
Phase 1 — Customer identity infrastructure  
Stage B next: repositories only

## Completed
- Availability engine fixed: final slots align to blockDuration.
- Customer name split completed: firstName + lastName.
- Frontend CustomerStep validation completed.
- Migration 0004_auth_identity generated and applied.
- customers.marketingConsent added.
- otp_verifications table added.
- customer_sessions table added with nullable customerId and required phone.
- npx tsc --noEmit passes.
- Latest relevant commit completed.

## Next Step
Stage B — repositories only:
- otp-verification.repository.ts
- customer-session.repository.ts

## Do Not Do Yet
- No auth service yet.
- No API routes yet.
- No UI changes.
- No booking flow changes.
- No OTP provider integration.
- No SmartBookingStep.

## Important Product Rules
- Phone is customer identity.
- OTP mock code 1234 is allowed only when NODE_ENV !== 'production'.
- Production must never accept fixed 1234.
- No customer stubs with empty firstName/lastName.
- customer_sessions.customerId may be null until profile completion.
- Booking for someone else creates one appointment only:
  - customer_id = service recipient
  - booked_by_customer_id = verified booker
  - reminder recipient must be explicit.
