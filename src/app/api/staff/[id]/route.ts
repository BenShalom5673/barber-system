import { NextResponse } from 'next/server';
import {
  updateStaff,
  deactivateStaff,
  type UpdateStaffParams,
} from '@/server/services/staff.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  parseBody,
  mapDomainError,
} from '@/server/lib/route-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      return NextResponse.json({ error: 'Invalid staff id.' }, { status: 400 });
    }

    const body = await parseBody<UpdateStaffParams>(request);
    if (body instanceof Response) return body as NextResponse;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    const profile = await updateStaff(barbershopId, id, body);
    return NextResponse.json(profile);
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
      return NextResponse.json({ error: 'Invalid staff id.' }, { status: 400 });
    }

    const profile = await deactivateStaff(barbershopId, id);
    return NextResponse.json(profile);
  } catch (err) {
    return mapDomainError(err);
  }
}
