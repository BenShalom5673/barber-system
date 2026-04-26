# Stage C — Auth Service Plan

## Goal
Build customer OTP auth service only.

## Allowed
- Auth service file only
- Use `otp-verification.repository`
- Use `customer-session.repository`
- Mock OTP code `1234` allowed only when `NODE_ENV !== 'production'`

## Not Allowed
- No API routes
- No UI
- No booking flow changes
- No schema changes
- No migrations

## Final Decisions
- OTP expiry: 5 minutes
- Max OTP attempts: 5
- Session duration: 30 days
- OTP storage: hashed always
- Session token: crypto random token
- One active OTP per phone: yes
- One active session per phone: no, not for now
- Cookie name later: `customer_session`

## Important Rules
- Production must never accept fixed code `1234`
- Repository layer must stay dumb DB access only
- Auth service owns validation logic
- Do not create customer stubs
- `customer_sessions.customerId` may stay null until profile completion