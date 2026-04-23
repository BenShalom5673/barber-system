import { NextResponse } from 'next/server';
import {
  listServices,
  createService,
  type CreateServiceParams,
} from '@/server/services/service.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const SERVICE_TYPES = new Set(['direct_booking', 'consultation_only']);
const DEPOSIT_TYPES = new Set(['percentage', 'fixed']);

export async function GET(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const svcs = await listServices(barbershopId);
    return NextResponse.json(svcs);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<CreateServiceParams>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }

    if (
      typeof body.durationMinutes !== 'number' ||
      !Number.isInteger(body.durationMinutes) ||
      body.durationMinutes < 1
    ) {
      return NextResponse.json(
        { error: 'durationMinutes must be a positive integer.' },
        { status: 400 },
      );
    }

    if (
      typeof body.priceAgorot !== 'number' ||
      !Number.isInteger(body.priceAgorot) ||
      body.priceAgorot < 0
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

    const service = await createService(barbershopId, body);
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    return mapDomainError(err);
  }
}
