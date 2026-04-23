import { NextResponse } from 'next/server';
import {
  getNoShowPolicy,
  saveNoShowPolicy,
  type NoShowPolicyRow,
} from '@/server/services/settings.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

export async function GET(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const policy = await getNoShowPolicy(barbershopId);
    return NextResponse.json(policy);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<unknown>(request);
    if (body instanceof Response) return body as NextResponse;

    // Route-layer shape check: payload must be an array.
    // Deep validation (offenseNumber, chargePercent values) is handled by the service.
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON array of policy rows.' },
        { status: 400 },
      );
    }

    const policy = await saveNoShowPolicy(barbershopId, body as NoShowPolicyRow[]);
    return NextResponse.json(policy);
  } catch (err) {
    return mapDomainError(err);
  }
}
