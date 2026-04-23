import {
  localTimeToUtc,
  generateCandidateSlots,
  rangesOverlap,
} from '@/lib/slot-utils';
import { findBarbershopSettings, findWorkingHoursForDay, findOverridesForDate } from '@/server/repositories/schedule.repository';
import { findStaffById } from '@/server/repositories/staff.repository';
import { findServiceById } from '@/server/repositories/service.repository';
import { findActiveAppointmentsForStaffInWindow } from '@/server/repositories/appointment.repository';
import {
  StaffNotFoundError,
  ServiceNotFoundError,
  StaffNotAvailableError,
  ServiceNotOfferedByStaffError,
} from '@/server/errors/domain';
import { staffOffersService } from '@/server/repositories/staff.repository';

// Defaults used when barbershop_settings row does not yet exist
const DEFAULT_BUFFER_MINUTES = 5;
const DEFAULT_SLOT_INTERVAL_MINUTES = 15;
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

export interface GetAvailableSlotsParams {
  barbershopId: string;
  staffProfileId: string;
  serviceId: string;
  /** The date to check, in YYYY-MM-DD format (interpreted in the barbershop timezone) */
  dateStr: string;
}

/**
 * Returns an array of available slot start times (UTC Date objects) for a
 * given staff member, service, and date.
 *
 * Algorithm:
 * 1. Validate staff and service exist and are active.
 * 2. Confirm the staff member offers the requested service.
 * 3. Load barbershop settings (buffer, slot interval, timezone).
 * 4. Load working hours for the day of week.
 * 5. Apply any schedule overrides for the specific date.
 * 6. Generate candidate slots at slotIntervalMinutes increments.
 * 7. Load existing (non-cancelled) appointments in the working window.
 * 8. Filter out candidates that overlap any existing appointment.
 */
export async function getAvailableSlots(
  params: GetAvailableSlotsParams,
): Promise<Date[]> {
  const { barbershopId, staffProfileId, serviceId, dateStr } = params;

  // 1. Validate entities
  const [staff, service] = await Promise.all([
    findStaffById(barbershopId, staffProfileId),
    findServiceById(barbershopId, serviceId),
  ]);

  if (!staff) throw new StaffNotFoundError(staffProfileId);
  if (!service) throw new ServiceNotFoundError(serviceId);

  // 2. Confirm staff offers this service
  const offers = await staffOffersService(barbershopId, staffProfileId, serviceId);
  if (!offers) throw new ServiceNotOfferedByStaffError(staffProfileId, serviceId);

  // 3. Load settings (fall back to defaults)
  const settings = await findBarbershopSettings(barbershopId);
  const bufferMinutes = settings?.appointmentBufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const slotInterval = settings?.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES;
  const timezone = DEFAULT_TIMEZONE; // barbershops.timezone not yet on settings row; use constant

  // 4. Determine day of week (0 = Sunday) from the dateStr in the barbershop timezone
  // Parse the date string as a local date in the barbershop timezone
  const dayOfWeek = getDayOfWeek(dateStr, timezone);
  const workingHours = await findWorkingHoursForDay(staffProfileId, dayOfWeek);

  // 5. Apply schedule overrides
  const overrides = await findOverridesForDate(staffProfileId, dateStr);

  const dayOffOverride = overrides.find((o) => o.overrideType === 'day_off');
  if (dayOffOverride) return [];

  if (!workingHours && !overrides.some((o) => o.overrideType === 'custom_hours')) {
    // No working hours configured for this day and no custom_hours override
    return [];
  }

  // Determine the effective working window for this date
  let windowStartStr: string;
  let windowEndStr: string;

  const customHoursOverride = overrides.find((o) => o.overrideType === 'custom_hours');
  if (customHoursOverride?.startTime && customHoursOverride.endTime) {
    windowStartStr = customHoursOverride.startTime;
    windowEndStr = customHoursOverride.endTime;
  } else if (workingHours) {
    windowStartStr = workingHours.startTime;
    windowEndStr = workingHours.endTime;
  } else {
    return [];
  }

  const windowStart = localTimeToUtc(dateStr, windowStartStr, timezone);
  const windowEnd = localTimeToUtc(dateStr, windowEndStr, timezone);

  // 6. Generate candidates
  const candidates = generateCandidateSlots(
    windowStart,
    windowEnd,
    slotInterval,
    service.durationMinutes,
    bufferMinutes,
  );

  if (candidates.length === 0) return [];

  // 7. Load existing appointments covering this window
  const existingAppointments = await findActiveAppointmentsForStaffInWindow(
    staffProfileId,
    windowStart,
    windowEnd,
  );

  // Parse booked ranges from slotRange strings.
  // PostgreSQL tstzrange is returned as e.g. `["2026-04-23 09:00:00+00","2026-04-23 09:35:00+00")`
  const bookedRanges = existingAppointments.map((appt) =>
    parseTstzrange(appt.slotRange as string),
  );

  // Also collect blocked_slot overrides
  const blockedRanges = overrides
    .filter((o) => o.overrideType === 'blocked_slot' && o.startTime && o.endTime)
    .map((o) => ({
      start: localTimeToUtc(dateStr, o.startTime!, timezone),
      end: localTimeToUtc(dateStr, o.endTime!, timezone),
    }));

  const allBlockedRanges = [...bookedRanges, ...blockedRanges];

  // 8. Filter candidates
  const slotDurationMs = (service.durationMinutes + bufferMinutes) * 60_000;

  return candidates.filter((slotStart) => {
    const slotEnd = new Date(slotStart.getTime() + slotDurationMs);
    return !allBlockedRanges.some((b) => rangesOverlap(slotStart, slotEnd, b.start, b.end));
  });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns the day-of-week (0=Sun … 6=Sat) for a YYYY-MM-DD date string
 * as seen in the given IANA timezone.
 */
function getDayOfWeek(dateStr: string, timezone: string): number {
  // Parse date parts and create a noon UTC time (avoids any DST edge case pushing the date back)
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });

  const weekdayStr = formatter.format(noonUtc); // "Sun", "Mon", …
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekdayStr] ?? 0;
}

/**
 * Parses a PostgreSQL tstzrange string into {start, end} UTC Dates.
 * Handles both inclusive `[` and exclusive `(` bounds on either side.
 * Format example: `["2026-04-23 09:00:00+00","2026-04-23 09:35:00+00")`
 */
function parseTstzrange(raw: string): { start: Date; end: Date } {
  // Strip the bracket characters and split on the comma between the timestamps
  const inner = raw.replace(/^[\[(]/, '').replace(/[\])]$/, '');
  // The two timestamps are separated by a comma; timestamps themselves contain no commas
  const commaIdx = inner.indexOf(',');
  const startStr = inner.slice(0, commaIdx).replace(/"/g, '').trim();
  const endStr = inner.slice(commaIdx + 1).replace(/"/g, '').trim();
  return { start: new Date(startStr), end: new Date(endStr) };
}
