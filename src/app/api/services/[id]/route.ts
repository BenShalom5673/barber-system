import { NextResponse } from 'next/server';
import {
  updateService,
  deactivateService,
  type UpdateServiceParams,
} from '@/server/services/service.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVICE_TYPES = new Set(['direct_booking', 'consultation_only']);
const DEPOSIT_TYPES = new Set(['percentage', 'fixed']);

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid service id.' }, { status: 400 });
    }

    const body = await parseBody<UpdateServiceParams>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'name must be a non-empty string.' }, { status: 400 });
    }

    if (
      body.durationMinutes !== undefined &&
      (typeof body.durationMinutes !== 'number' ||
        !Number.isInteger(body.durationMinutes) ||
        body.durationMinutes < 1)
    ) {
      return NextResponse.json(
        { error: 'durationMinutes must be a positive integer.' },
        { status: 400 },
      );
    }

    if (
      body.priceAgorot !== undefined &&
      (typeof body.priceAgorot !== 'number' ||
        !Number.isInteger(body.priceAgorot) ||
        body.priceAgorot < 0)
    ) {
      return NextResponse.json(
        { error: 'priceAgorot must be a non-negative integer.' },
        { status: 400 },
      );
    }

    if (body.serviceType !== undefined && !SERVICE_TYPES.has(body.serviceType)) {
      return NextResponse.json(
        { error: 'serviceType must be "direct_booking" or "consultation_only".' },
        { status: 400 },
      );
    }

    if (
      body.depositType !== undefined &&
      body.depositType !== null &&
      !DEPOSIT_TYPES.has(body.depositType)
    ) {
      return NextResponse.json(
        { error: 'depositType must be "percentage", "fixed", or null.' },
        { status: 400 },
      );
    }

    const service = await updateService(barbershopId, id, body);
    return NextResponse.json(service);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid service id.' }, { status: 400 });
    }

    const service = await deactivateService(barbershopId, id);
    return NextResponse.json(service);
  } catch (err) {
    return mapDomainError(err);
  }
}
