import { NextResponse } from 'next/server';
import {
  getOperationalSettings,
  saveOperationalSettings,
  type SaveOperationalSettingsParams,
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
    const settings = await getOperationalSettings(barbershopId);

    if (!settings) {
      return NextResponse.json(
        { error: 'Operational settings have not been configured yet.' },
        { status: 404 },
      );
    }

    return NextResponse.json(settings);
  } catch (err) {
    return mapDomainError(err);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const guard = guardInternalToken(request);
  if (guard) return guard as NextResponse;

  try {
    const barbershopId = resolveDevBarbershopId();

    const body = await parseBody<Omit<SaveOperationalSettingsParams, 'barbershopId'>>(request);
    if (body instanceof Response) return body as NextResponse;

    const settings = await saveOperationalSettings({ ...body, barbershopId });
    return NextResponse.json(settings);
  } catch (err) {
    return mapDomainError(err);
  }
}
