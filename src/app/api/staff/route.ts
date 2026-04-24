import { NextResponse } from 'next/server';
import { listStaffForService, createStaff, type CreateStaffParams } from '@/server/services/staff.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');

  if (!serviceId) {
    return NextResponse.json({ error: 'serviceId query parameter is required.' }, { status: 400 });
  }
  if (!UUID_REGEX.test(serviceId)) {
    return NextResponse.json({ error: 'serviceId must be a valid UUID.' }, { status: 400 });
  }

  try {
    const barbershopId = resolveDevBarbershopId();
    const staff = await listStaffForService(barbershopId, serviceId);
    return NextResponse.json(
      staff.map((s) => ({ id: s.id, displayName: s.displayName, bio: s.bio })),
    );
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
