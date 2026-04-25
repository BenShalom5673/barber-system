import { NextResponse } from 'next/server';
import { bookAppointment } from '@/server/services/booking.service';
import {
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts Z (UTC) or explicit +HH:MM / -HH:MM offset. Rejects bare ISO strings with no offset.
const ISO_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidUuid(v: string): boolean {
  return UUID_REGEX.test(v);
}

function isValidCalendarDate(v: string): boolean {
  if (!DATE_REGEX.test(v)) return false;
  const [year, month, day] = v.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<Record<string, unknown>>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    if (typeof body.staffProfileId !== 'string' || !isValidUuid(body.staffProfileId)) {
      return NextResponse.json({ error: 'staffProfileId must be a valid UUID.' }, { status: 400 });
    }

    if (typeof body.serviceId !== 'string' || !isValidUuid(body.serviceId)) {
      return NextResponse.json({ error: 'serviceId must be a valid UUID.' }, { status: 400 });
    }

    // start must include explicit +HH:MM or -HH:MM — Z and bare ISO are rejected
    if (typeof body.start !== 'string' || !ISO_OFFSET_REGEX.test(body.start)) {
      return NextResponse.json(
        {
          error:
            'start must be an ISO datetime with a timezone indicator, e.g. 2026-04-26T12:00:00+03:00 or 2026-04-26T09:00:00Z. Bare ISO strings without an offset are not accepted.',
        },
        { status: 400 },
      );
    }
    const slotStartDate = new Date(body.start);
    if (isNaN(slotStartDate.getTime())) {
      return NextResponse.json({ error: 'start is not a valid datetime.' }, { status: 400 });
    }

    if (typeof body.customerName !== 'string' || !body.customerName.trim()) {
      return NextResponse.json({ error: 'customerName is required.' }, { status: 400 });
    }

    if (typeof body.customerPhone !== 'string' || !body.customerPhone.trim()) {
      return NextResponse.json({ error: 'customerPhone is required.' }, { status: 400 });
    }

    if (
      body.customerEmail !== undefined &&
      (typeof body.customerEmail !== 'string' || !EMAIL_REGEX.test(body.customerEmail))
    ) {
      return NextResponse.json(
        { error: 'customerEmail must be a valid email address.' },
        { status: 400 },
      );
    }

    if (
      body.customerBirthDate !== undefined &&
      (typeof body.customerBirthDate !== 'string' || !isValidCalendarDate(body.customerBirthDate))
    ) {
      return NextResponse.json(
        { error: 'customerBirthDate must be a valid date in YYYY-MM-DD format.' },
        { status: 400 },
      );
    }

    const result = await bookAppointment({
      barbershopId,
      staffProfileId: body.staffProfileId,
      serviceId: body.serviceId,
      start: body.start,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone.trim(),
      ...(typeof body.customerEmail === 'string' && { customerEmail: body.customerEmail }),
      ...(typeof body.customerBirthDate === 'string' && {
        customerBirthDate: body.customerBirthDate,
      }),
      ...(typeof body.clientNotes === 'string' &&
        body.clientNotes.trim() && { clientNotes: body.clientNotes.trim() }),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    // DB GiST exclusion constraint violation — concurrent booking race condition
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: string }).code === '23P01'
    ) {
      return NextResponse.json(
        { error: 'The requested time slot is no longer available.' },
        { status: 409 },
      );
    }

    // Invalid phone format thrown by normalisePhone in customer.service
    if (err instanceof Error && err.message.startsWith('Unrecognised phone format')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return mapDomainError(err);
  }
}
