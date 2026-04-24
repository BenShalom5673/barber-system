import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/server/services/availability.service';
import {
  ServiceNotFoundError,
  StaffNotFoundError,
  ServiceNotOfferedByStaffError,
} from '@/server/errors/domain';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const barbershopId   = searchParams.get('barbershopId');
  const serviceId      = searchParams.get('serviceId');
  const date           = searchParams.get('date');
  const staffProfileId = searchParams.get('staffProfileId') ?? undefined;

  if (!barbershopId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'barbershopId, serviceId, and date are required.' },
      { status: 400 },
    );
  }

  try {
    const result = await getAvailableSlots({ barbershopId, serviceId, date, staffProfileId });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid date.') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ServiceNotFoundError || err instanceof StaffNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ServiceNotOfferedByStaffError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : 'Internal server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
