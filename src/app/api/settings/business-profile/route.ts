import { NextResponse } from 'next/server';
import {
  requireBusinessProfile,
  createInitialBusinessProfile,
  updateExistingBusinessProfile,
  type CreateBusinessProfileParams,
  type UpdateBusinessProfileParams,
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
    const profile = await requireBusinessProfile(barbershopId);
    return NextResponse.json(profile);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<Omit<CreateBusinessProfileParams, 'barbershopId'>>(request);
    if (body instanceof Response) return body as NextResponse;

    const profile = await createInitialBusinessProfile({ ...body, barbershopId });
    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<UpdateBusinessProfileParams>(request);
    if (body instanceof Response) return body as NextResponse;

    const profile = await updateExistingBusinessProfile(barbershopId, body);
    return NextResponse.json(profile);
  } catch (err) {
    return mapDomainError(err);
  }
}
