import {
  localTimeToUtc,
  generateCandidateSlots,
  rangesOverlap,
} from '@/lib/slot-utils';
import {
  findBarbershopSettings,
  findWorkingHoursForDay,
  findOverridesForDate,
} from '@/server/repositories/schedule.repository';
import {
  findStaffById,
  findActiveStaffForService,
  type StaffProfile,
} from '@/server/repositories/staff.repository';
import { findServiceById } from '@/server/repositories/service.repository';
import { findActiveAppointmentsForStaffInWindow } from '@/server/repositories/appointment.repository';
import {
  StaffNotFoundError,
  ServiceNotFoundError,
  ServiceNotOfferedByStaffError,
} from '@/server/errors/domain';

// Fallback values used only when barbershop_settings row does not yet exist
const DEFAULT_BUFFER_MINUTES = 5;
// Assumption: all barbershops are in Asia/Jerusalem.
// A per-barbershop timezone column does not exist on barbershop_settings yet.
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GetAvailableSlotsParams {
  barbershopId: string;
  serviceId: string;
  /** Date to check, in YYYY-MM-DD format (interpreted in the barbershop timezone) */
  date: string;
  /** If provided, compute slots only for this staff member (eligibility rule still applies) */
  staffProfileId?: string;
}

export interface SlotEntry {
  /** ISO 8601 with timezone offset (local barbershop time), e.g. "2026-04-23T12:00:00+03:00" */
  start: string;
  /** ISO 8601 with timezone offset — equals start + service.durationMinutes (buffer excluded from end) */
  end: string;
}

export interface StaffSummary {
  staffProfileId: string;
  displayName: string;
  /** Null when this staff member has no available slots on the requested date */
  earliestSlot: SlotEntry | null;
}

export interface MultiStaffResult {
  mode: 'multi_staff';
  /**
   * ALL eligible active staff for the service, including those with no slots.
   * Sort order:
   *   1. earliestSlot != null — ascending by earliestSlot.start
   *   2. earliestSlot == null — ascending by displayName
   */
  staff: StaffSummary[];
}

export interface SingleStaffResult {
  mode: 'single_staff';
  staffProfileId: string;
  displayName: string;
  /** All available slots, ascending by start */
  slots: SlotEntry[];
}

export interface SpecificStaffResult {
  mode: 'specific_staff';
  staffProfileId: string;
  displayName: string;
  /** All available slots, ascending by start */
  slots: SlotEntry[];
}

export type GetAvailableSlotsResult =
  | MultiStaffResult
  | SingleStaffResult
  | SpecificStaffResult;

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Returns available appointment slots for a given service and date.
 *
 * Return mode is determined by eligible staff count and whether staffProfileId is pinned:
 *   staffProfileId provided   → 'specific_staff'  full slot list for that staff
 *   1 eligible staff, no pin  → 'single_staff'    full slot list
 *   2+ eligible staff, no pin → 'multi_staff'     earliestSlot only per staff, all included
 *
 * Staff eligibility rule (per staff member, evaluated at the DB level):
 *   No staff_services rows for this staff member  → eligible (offers all services)
 *   Has staff_services rows including serviceId   → eligible
 *   Has staff_services rows excluding serviceId   → ineligible
 *
 * Slot algorithm per staff member (see computeSlotsForStaff):
 *   1. Determine working window from weekly hours; custom_hours override takes precedence.
 *   2. Skip entirely if a day_off override exists or no hours are configured.
 *   3. Generate candidate starts at slotInterval-minute increments inside the window.
 *   4. Load existing appointments (non-cancelled, non-no_show) and blocked_slot overrides.
 *   5. Reject candidates whose [start, start+duration+buffer) overlaps any blocked range.
 *   6. Return accepted candidates; end = start + duration (buffer excluded from exposed end).
 */
export async function getAvailableSlots(
  params: GetAvailableSlotsParams,
): Promise<GetAvailableSlotsResult> {
  const { barbershopId, serviceId, date } = params;

  if (!isValidDateStr(date)) throw new Error('Invalid date.');

  // Validate service exists and is active for this barbershop
  const service = await findServiceById(barbershopId, serviceId);
  if (!service) throw new ServiceNotFoundError(serviceId);

  // Apply the per-staff eligibility rule at the DB level
  const eligibleStaff = await findActiveStaffForService(barbershopId, serviceId);

  // ─── Resolve target staff ─────────────────────────────────────────────────

  let targetStaff: StaffProfile[];
  let pinned = false;

  if (params.staffProfileId) {
    pinned = true;
    // The same eligibility rule applies to a pinned staff member.
    // Filter in memory from the already-fetched eligible list — no extra DB call on happy path.
    const match = eligibleStaff.find((s) => s.id === params.staffProfileId);

    if (!match) {
      // Distinguish "staff not found / inactive" from "excluded by assignment rule"
      // so the caller receives a meaningful domain error.
      const exists = await findStaffById(barbershopId, params.staffProfileId);
      if (!exists) throw new StaffNotFoundError(params.staffProfileId);
      throw new ServiceNotOfferedByStaffError(params.staffProfileId, serviceId);
    }

    targetStaff = [match];
  } else {
    targetStaff = eligibleStaff;
  }

  if (!pinned && targetStaff.length === 0) {
    return { mode: 'multi_staff', staff: [] };
  }

  // ─── Shared scheduling context ────────────────────────────────────────────

  const settings = await findBarbershopSettings(barbershopId);
  const bufferMinutes = settings?.appointmentBufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const timezone = DEFAULT_TIMEZONE;

  // Day-of-week is identical for every staff member on a given date — compute once
  const dayOfWeek = getDayOfWeek(date, timezone);

  const serviceDurationMs = service.durationMinutes * 60_000;
  // slotBlockMs is used only for overlap checks — includes buffer to prevent back-to-back booking
  const slotBlockMs = (service.durationMinutes + bufferMinutes) * 60_000;

  // ─── Single-staff paths (specific_staff / single_staff) ───────────────────

  if (pinned || targetStaff.length === 1) {
    const staffMember = targetStaff[0]!;
    const slots = await computeSlotsForStaff(
      staffMember.id,
      date,
      dayOfWeek,
      timezone,
      service.durationMinutes,
      bufferMinutes,
      serviceDurationMs,
      slotBlockMs,
    );

    if (pinned) {
      return {
        mode: 'specific_staff',
        staffProfileId: staffMember.id,
        displayName: staffMember.displayName,
        slots,
      };
    }

    return {
      mode: 'single_staff',
      staffProfileId: staffMember.id,
      displayName: staffMember.displayName,
      slots,
    };
  }

  // ─── Multi-staff path ─────────────────────────────────────────────────────

  const summaries: StaffSummary[] = [];

  for (const staffMember of targetStaff) {
    const slots = await computeSlotsForStaff(
      staffMember.id,
      date,
      dayOfWeek,
      timezone,
      service.durationMinutes,
      bufferMinutes,
      serviceDurationMs,
      slotBlockMs,
    );

    summaries.push({
      staffProfileId: staffMember.id,
      displayName: staffMember.displayName,
      // computeSlotsForStaff returns ascending order so slots[0] is the earliest
      earliestSlot: slots[0] ?? null,
    });
  }

  // Sort: non-null earliestSlot first (asc by start), then null (asc by displayName)
  summaries.sort((a, b) => {
    if (a.earliestSlot && b.earliestSlot) {
      return a.earliestSlot.start.localeCompare(b.earliestSlot.start);
    }
    if (a.earliestSlot) return -1;
    if (b.earliestSlot) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return { mode: 'multi_staff', staff: summaries };
}

// ─── Private: per-staff slot calculation ─────────────────────────────────────

async function computeSlotsForStaff(
  staffProfileId: string,
  date: string,
  dayOfWeek: number,
  timezone: string,
  serviceDurationMinutes: number,
  bufferMinutes: number,
  serviceDurationMs: number,
  slotBlockMs: number,
): Promise<SlotEntry[]> {
  const [workingHours, overrides] = await Promise.all([
    findWorkingHoursForDay(staffProfileId, dayOfWeek),
    findOverridesForDate(staffProfileId, date),
  ]);

  // day_off takes absolute precedence over any working hours for this date
  if (overrides.some((o) => o.overrideType === 'day_off')) return [];

  // Assumption: at most one custom_hours override per staff per date.
  // If multiple exist the first one wins.
  const customHours = overrides.find(
    (o) => o.overrideType === 'custom_hours' && o.startTime && o.endTime,
  );

  let windowStartStr: string;
  let windowEndStr: string;

  if (customHours?.startTime && customHours.endTime) {
    // custom_hours replaces the regular weekly schedule for this specific date
    windowStartStr = customHours.startTime;
    windowEndStr = customHours.endTime;
  } else if (workingHours) {
    windowStartStr = workingHours.startTime;
    windowEndStr = workingHours.endTime;
  } else {
    // No weekly hours configured for this day and no custom_hours override
    return [];
  }

  const windowStart = localTimeToUtc(date, windowStartStr, timezone);
  const windowEnd = localTimeToUtc(date, windowEndStr, timezone);

  const candidates = generateCandidateSlots(
    windowStart,
    windowEnd,
    serviceDurationMinutes + bufferMinutes,
    serviceDurationMinutes,
    bufferMinutes,
  );

  const existingAppointments = await findActiveAppointmentsForStaffInWindow(
    staffProfileId,
    windowStart,
    windowEnd,
  );

  // PostgreSQL returns slotRange as a tstzrange string, e.g.:
  // `["2026-04-23 09:00:00+00","2026-04-23 09:35:00+00")`
  const bookedRanges = existingAppointments.map((appt) =>
    parseTstzrange(appt.slotRange as string),
  );

  // blocked_slot overrides consume grid time exactly like booked appointments
  const blockedRanges = overrides
    .filter((o) => o.overrideType === 'blocked_slot' && o.startTime && o.endTime)
    .map((o) => ({
      start: localTimeToUtc(date, o.startTime!, timezone),
      end: localTimeToUtc(date, o.endTime!, timezone),
    }));

  const allBlockedRanges = [...bookedRanges, ...blockedRanges];

  // Inject gap-start candidates: when a blocked range ends mid-grid, offer the
  // exact boundary as a start if the service + buffer fits before the window end.
  // This prevents tight gaps from being silently skipped by the fixed grid.
  const FIVE_MIN_MS = 5 * 60_000;
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();

  // Gap-based propagation: from each blocked range's end, step forward in
  // service-duration increments. Only 5-minute-aligned candidates are kept —
  // all service durations are configured in 5-minute increments so this is lossless.
  const gapCandidates: Date[] = [];
  for (const range of allBlockedRanges) {
    let t = range.end.getTime();
    while (t + slotBlockMs <= windowEndMs) {
      if (t % FIVE_MIN_MS === 0 && t >= windowStartMs) {
        gapCandidates.push(new Date(t));
      }
      t += slotBlockMs;
    }
  }

  // Merge grid candidates and gap candidates, deduplicate by timestamp, sort ascending
  const seen = new Set<number>();
  const allCandidates: Date[] = [];
  for (const c of [...candidates, ...gapCandidates]) {
    const ms = c.getTime();
    if (!seen.has(ms)) {
      seen.add(ms);
      allCandidates.push(c);
    }
  }
  allCandidates.sort((a, b) => a.getTime() - b.getTime());

  if (allCandidates.length === 0) return [];

  const slots: SlotEntry[] = [];

  for (const slotStart of allCandidates) {
    // Overlap check uses slotBlockMs (duration + buffer) to prevent back-to-back booking
    const slotBlockEnd = new Date(slotStart.getTime() + slotBlockMs);
    const overlaps = allBlockedRanges.some((b) =>
      rangesOverlap(slotStart, slotBlockEnd, b.start, b.end),
    );

    if (!overlaps) {
      slots.push({
        start: formatLocalIso(slotStart, timezone),
        // end is service duration only — buffer is internal and not exposed to callers
        end: formatLocalIso(new Date(slotStart.getTime() + serviceDurationMs), timezone),
      });
    }
  }

  return slots;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if dateStr is a well-formed YYYY-MM-DD string that maps to a
 * real calendar date. Rejects malformed strings and overflowed dates such as
 * 2026-02-30 (which JavaScript's Date would silently roll over to 2026-03-02).
 */
function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Returns the day-of-week integer (0=Sun … 6=Sat) for a YYYY-MM-DD string
 * as observed in the given IANA timezone.
 * Uses noon UTC to avoid DST boundaries pushing the date to the wrong day.
 */
function getDayOfWeek(dateStr: string, timezone: string): number {
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });

  const weekdayStr = formatter.format(noonUtc);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekdayStr] ?? 0;
}

/**
 * Parses a PostgreSQL tstzrange string into { start, end } UTC Dates.
 * Handles both inclusive `[` and exclusive `(` bounds on either side.
 * Example: `["2026-04-23 09:00:00+00","2026-04-23 09:35:00+00")`
 */
function parseTstzrange(raw: string): { start: Date; end: Date } {
  const inner = raw.replace(/^[\[(]/, '').replace(/[\])]$/, '');
  const commaIdx = inner.indexOf(',');
  const startStr = inner.slice(0, commaIdx).replace(/"/g, '').trim();
  const endStr = inner.slice(commaIdx + 1).replace(/"/g, '').trim();
  return { start: new Date(startStr), end: new Date(endStr) };
}

/**
 * Converts a UTC Date to an ISO 8601 string in the given IANA timezone,
 * including the correct UTC offset for that instant (DST-aware via Intl).
 * Example: 2026-04-23T09:00:00Z in Asia/Jerusalem → "2026-04-23T12:00:00+03:00"
 */
function formatLocalIso(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  let h = parseInt(get('hour'), 10);
  if (h === 24) h = 0;

  // Reconstruct the local epoch to compute the actual offset at this instant
  const localMs = Date.UTC(
    parseInt(get('year'), 10),
    parseInt(get('month'), 10) - 1,
    parseInt(get('day'), 10),
    h,
    parseInt(get('minute'), 10),
    parseInt(get('second'), 10),
  );

  const offsetMs = localMs - date.getTime();
  const sign = offsetMs >= 0 ? '+' : '-';
  const absMs = Math.abs(offsetMs);
  const oh = Math.floor(absMs / 3_600_000);
  const om = Math.floor((absMs % 3_600_000) / 60_000);

  const hh = String(h).padStart(2, '0');
  return (
    `${get('year')}-${get('month')}-${get('day')}T` +
    `${hh}:${get('minute')}:${get('second')}` +
    `${sign}${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}`
  );
}
