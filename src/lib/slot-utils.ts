/**
 * Pure utility functions for time slot generation and range arithmetic.
 * No DB access, no side effects — safe to import anywhere including client.
 */

/**
 * Given a date string (YYYY-MM-DD) and a time string (HH:MM:SS from PostgreSQL `time`),
 * in a given IANA timezone, returns a UTC Date.
 */
export function localTimeToUtc(
  dateStr: string, // e.g. "2026-04-23"
  timeStr: string, // e.g. "09:00:00"
  timezone: string, // e.g. "Asia/Jerusalem"
): Date {
  // Build an ISO-like string and interpret it in the given timezone using
  // Intl.DateTimeFormat offset calculation (no external libs required).
  const [year, month, day] = dateStr.split('-').map(Number) as [number, number, number];
  const [hour, minute, second] = timeStr.split(':').map(Number) as [number, number, number];

  // Create a UTC date from the components and then offset by the timezone's UTC offset at that moment.
  // We use the trick of formatting a known UTC time back in the target timezone to find the offset.
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Get the local time that this UTC instant corresponds to in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(candidate);
  const get = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const localYear = get('year');
  const localMonth = get('month');
  const localDay = get('day');
  let localHour = get('hour');
  const localMinute = get('minute');
  const localSec = get('second');

  // Normalize hour 24 → 0 (some browsers emit "24:00:00" for midnight)
  if (localHour === 24) localHour = 0;

  // Offset in milliseconds between the UTC candidate and what the timezone thinks it is
  const localAsUtc = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSec);
  const offsetMs = candidate.getTime() - localAsUtc;

  return new Date(candidate.getTime() + offsetMs);
}

/**
 * Formats a Date as a PostgreSQL tstzrange literal.
 * Uses half-open [start, end) semantics.
 */
export function toTstzrange(start: Date, end: Date): string {
  return `[${start.toISOString()},${end.toISOString()})`;
}

/**
 * Generates candidate slot start times within a working window.
 *
 * @param windowStart   Start of working window (UTC)
 * @param windowEnd     End of working window (UTC)
 * @param slotInterval  Interval between candidate starts, in minutes
 * @param serviceDuration  Duration of the service, in minutes (excluding buffer)
 * @param bufferMinutes Buffer added after each appointment, in minutes
 * @returns Array of candidate start times (UTC). Each start guarantees
 *          that [start, start + duration + buffer) fits inside the window.
 */
export function generateCandidateSlots(
  windowStart: Date,
  windowEnd: Date,
  slotInterval: number,
  serviceDuration: number,
  bufferMinutes: number,
): Date[] {
  const slotDurationMs = (serviceDuration + bufferMinutes) * 60_000;
  const intervalMs = slotInterval * 60_000;
  const slots: Date[] = [];

  let cursor = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();

  while (cursor + slotDurationMs <= windowEndMs) {
    slots.push(new Date(cursor));
    cursor += intervalMs;
  }

  return slots;
}

/**
 * Returns true if [aStart, aEnd) overlaps [bStart, bEnd).
 * Half-open intervals: touching boundaries do NOT overlap.
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Normalises a phone number string to E.164 format for Israeli numbers.
 * Accepts formats: 05X-XXXXXXX, 05XXXXXXXX, +9725XXXXXXXX, 9725XXXXXXXX
 * Returns the E.164 string or throws if the format is unrecognised.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Already in full international format
  if (digits.startsWith('972') && digits.length === 12) {
    return `+${digits}`;
  }

  // Local Israeli mobile / landline: 0XXXXXXXXX (10 digits)
  if (digits.startsWith('0') && digits.length === 10) {
    return `+972${digits.slice(1)}`;
  }

  // Already stripped of leading zero: 5XXXXXXXX (9 digits — Israeli mobile)
  if (digits.length === 9 && digits.startsWith('5')) {
    return `+972${digits}`;
  }

  throw new Error(`Unrecognised phone format: "${raw}"`);
}
