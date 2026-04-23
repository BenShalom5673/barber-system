-- Enable the btree_gist extension required for mixed-type GiST exclusion constraints.
-- This allows combining an equality check (uuid) with a range overlap check (tstzrange)
-- in a single exclusion constraint index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent double-booking: no two active appointments for the same staff member
-- may have overlapping time ranges.
--
-- Excluded from the constraint (do not block slot reuse):
--   'cancelled' — all cancellations (by client, owner, or system)
--   'no_show'   — customer did not attend; slot can be retrospectively freed
--
-- 'pending_deposit' IS included: a slot held pending payment blocks rebooking
-- until either the deposit is paid (→ confirmed) or the expiry cron cancels it.
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_double_booking
  EXCLUDE USING GIST (
    staff_profile_id WITH =,
    slot_range WITH &&
  )
  WHERE (
    status NOT IN ('cancelled', 'no_show')
  );
