import { NextResponse } from 'next/server';
import { getOnboardingStatus } from '@/server/services/settings.service';
import {
  guardInternalToken,
  resolveDevBarbershopId,
  mapDomainError,
} from '@/server/lib/route-utils';

export async function GET(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();
    const status = await getOnboardingStatus(barbershopId);
    return NextResponse.json(status);
  } catch (err) {
    return mapDomainError(err);
  }
}
