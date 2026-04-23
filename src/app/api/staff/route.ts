import { NextResponse } from 'next/server';
import { listStaff, createStaff, type CreateStaffParams } from '@/server/services/staff.service';
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
    const staff = await listStaff(barbershopId);
    return NextResponse.json(staff);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<CreateStaffParams>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    if (!body.displayName || typeof body.displayName !== 'string' || !body.displayName.trim()) {
      return NextResponse.json({ error: 'displayName is required.' }, { status: 400 });
    }

    const profile = await createStaff(barbershopId, body);
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    return mapDomainError(err);
  }
}
