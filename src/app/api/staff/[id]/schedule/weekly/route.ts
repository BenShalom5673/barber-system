import { NextResponse } from 'next/server';
import { setWeeklySchedule, type WorkingHoursEntry } from '@/server/services/schedule.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid staff id.' }, { status: 400 });
    }

    const body = await parseBody<{ schedule: unknown }>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    if (!Array.isArray(body.schedule)) {
      return NextResponse.json({ error: 'schedule must be an array.' }, { status: 400 });
    }

    const schedule: WorkingHoursEntry[] = [];
    const seenDays = new Set<number>();

    for (let i = 0; i < body.schedule.length; i++) {
      const entry = body.schedule[i] as Record<string, unknown>;

      if (
        typeof entry.dayOfWeek !== 'number' ||
        !Number.isInteger(entry.dayOfWeek) ||
        entry.dayOfWeek < 0 ||
        entry.dayOfWeek > 6
      ) {
        return NextResponse.json(
          { error: `schedule[${i}].dayOfWeek must be an integer between 0 and 6.` },
          { status: 400 },
        );
      }

      if (!isValidTime(entry.startTime)) {
        return NextResponse.json(
          { error: `schedule[${i}].startTime must be in HH:MM or HH:MM:SS format.` },
          { status: 400 },
        );
      }

      if (!isValidTime(entry.endTime)) {
        return NextResponse.json(
          { error: `schedule[${i}].endTime must be in HH:MM or HH:MM:SS format.` },
          { status: 400 },
        );
      }

      if (entry.endTime <= entry.startTime) {
        return NextResponse.json(
          { error: `schedule[${i}].endTime must be after startTime.` },
          { status: 400 },
        );
      }

      if (seenDays.has(entry.dayOfWeek)) {
        return NextResponse.json(
          { error: `schedule contains duplicate dayOfWeek: ${entry.dayOfWeek}.` },
          { status: 400 },
        );
      }

      seenDays.add(entry.dayOfWeek);
      schedule.push({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }

    const result = await setWeeklySchedule(barbershopId, id, schedule);
    return NextResponse.json(result);
  } catch (err) {
    return mapDomainError(err);
  }
}
