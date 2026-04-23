import { NextResponse } from 'next/server';
import {
  DomainError,
  BusinessProfileNotFoundError,
  BusinessProfileAlreadyExistsError,
  InvalidVatRateError,
  InvalidChargePercentError,
  InvalidOffenseNumberError,
  CustomerNotFoundError,
  CustomerRestrictedError,
  CustomerIrrelevantError,
  AppointmentNotFoundError,
  AppointmentNotCancellableError,
  CancellationWindowExpiredError,
  SlotNotAvailableError,
  ServiceNotFoundError,
  StaffNotFoundError,
  ServiceNotOfferedByStaffError,
  DepositConfigurationMissingError,
  DepositRequiredError,
} from '@/server/errors/domain';

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Checks the x-internal-token header against INTERNAL_API_TOKEN env var.
 * Returns a 401 Response if the token is missing or wrong; null if allowed.
 * Replace this function with a real session check when Auth.js is introduced.
 */
export function guardInternalToken(request: Request): Response | null {
  const expected = process.env.INTERNAL_API_TOKEN;
  const provided = request.headers.get('x-internal-token');

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

// ─── Barbershop ID resolution ─────────────────────────────────────────────────

/**
 * Returns the barbershop ID for the current request from the server-side env.
 * DEV_BARBERSHOP_ID must be set to a real UUID that exists in the barbershops
 * table — it is not derived from the request.
 *
 * Replace this function with session.user.barbershopId when Auth.js is wired in.
 * All four call sites update automatically.
 */
export function resolveDevBarbershopId(): string {
  const id = process.env.DEV_BARBERSHOP_ID;
  if (!id) {
    throw new Error('DEV_BARBERSHOP_ID is not configured.');
  }
  return id;
}

// ─── Body parsing ─────────────────────────────────────────────────────────────

/**
 * Parses the request body as JSON.
 * Returns the parsed value typed as T, or a 400 Response for:
 *   - missing or non-JSON Content-Type
 *   - empty body
 *   - malformed JSON
 *
 * Does NOT enforce a specific shape (object vs array) — each route validates
 * the expected shape after calling this function.
 */
export async function parseBody<T>(request: Request): Promise<T | Response> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json.' },
      { status: 400 },
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
  }

  if (!text || text.trim() === '') {
    return NextResponse.json({ error: 'Request body is required.' }, { status: 400 });
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
}

// ─── Error mapping ────────────────────────────────────────────────────────────

/**
 * Maps DomainError subclasses to typed HTTP responses.
 * Falls through to 500 for any unhandled or unknown error.
 * Never leaks stack traces or raw DB messages to the client.
 */
export function mapDomainError(err: unknown): NextResponse {
  // 404
  if (
    err instanceof BusinessProfileNotFoundError ||
    err instanceof CustomerNotFoundError ||
    err instanceof AppointmentNotFoundError ||
    err instanceof ServiceNotFoundError ||
    err instanceof StaffNotFoundError
  ) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  // 409
  if (
    err instanceof BusinessProfileAlreadyExistsError ||
    err instanceof AppointmentNotCancellableError ||
    err instanceof CancellationWindowExpiredError ||
    err instanceof SlotNotAvailableError
  ) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }

  // 403
  if (err instanceof CustomerRestrictedError || err instanceof CustomerIrrelevantError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // 422
  if (
    err instanceof InvalidVatRateError ||
    err instanceof InvalidChargePercentError ||
    err instanceof InvalidOffenseNumberError ||
    err instanceof ServiceNotOfferedByStaffError ||
    err instanceof DepositRequiredError
  ) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }

  // 500 — deposit configuration is a server-side setup error, not a client error
  if (err instanceof DepositConfigurationMissingError) {
    console.error('[mapDomainError] Deposit configuration missing:', err.message);
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  // Catch-all for any other DomainError subclass not listed above
  if (err instanceof DomainError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Unknown errors — log server-side, return generic message
  console.error('[mapDomainError] Unhandled error:', err);
  return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
}
