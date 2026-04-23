import {
  findActiveServicesByBarbershop,
  findServiceById,
  createService as createServiceRecord,
  updateService as updateServiceRecord,
  deactivateService as deactivateServiceRecord,
  type Service,
} from '@/server/repositories/service.repository';
import { ServiceNotFoundError } from '@/server/errors/domain';

// ─── Param types ──────────────────────────────────────────────────────────────

export interface CreateServiceParams {
  name: string;
  nameHe?: string | null;
  description?: string | null;
  descriptionHe?: string | null;
  durationMinutes: number;
  priceAgorot: number;
  vatApplicable?: boolean;
  serviceType?: 'direct_booking' | 'consultation_only';
  availableForOnlineBooking?: boolean;
  displayOrder?: number;
  depositRequired?: boolean;
  depositType?: 'percentage' | 'fixed' | null;
  depositValue?: number | null;
}

export interface UpdateServiceParams {
  name?: string;
  nameHe?: string | null;
  description?: string | null;
  descriptionHe?: string | null;
  durationMinutes?: number;
  priceAgorot?: number;
  vatApplicable?: boolean;
  serviceType?: 'direct_booking' | 'consultation_only';
  availableForOnlineBooking?: boolean;
  displayOrder?: number;
  depositRequired?: boolean;
  depositType?: 'percentage' | 'fixed' | null;
  depositValue?: number | null;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function listServices(barbershopId: string): Promise<Service[]> {
  return findActiveServicesByBarbershop(barbershopId);
}

export async function createService(
  barbershopId: string,
  params: CreateServiceParams,
): Promise<Service> {
  return createServiceRecord({
    barbershopId,
    name: params.name,
    nameHe: params.nameHe ?? null,
    description: params.description ?? null,
    descriptionHe: params.descriptionHe ?? null,
    durationMinutes: params.durationMinutes,
    priceAgorot: params.priceAgorot,
    vatApplicable: params.vatApplicable ?? true,
    serviceType: params.serviceType ?? 'direct_booking',
    availableForOnlineBooking: params.availableForOnlineBooking ?? true,
    displayOrder: params.displayOrder ?? 0,
    depositRequired: params.depositRequired ?? false,
    depositType: params.depositType ?? null,
    depositValue: params.depositValue ?? null,
    isActive: true,
  });
}

export async function updateService(
  barbershopId: string,
  id: string,
  params: UpdateServiceParams,
): Promise<Service> {
  const existing = await findServiceById(barbershopId, id);
  if (!existing) throw new ServiceNotFoundError(id);

  const updated = await updateServiceRecord(barbershopId, id, {
    ...(params.name !== undefined && { name: params.name }),
    ...(params.nameHe !== undefined && { nameHe: params.nameHe }),
    ...(params.description !== undefined && { description: params.description }),
    ...(params.descriptionHe !== undefined && { descriptionHe: params.descriptionHe }),
    ...(params.durationMinutes !== undefined && { durationMinutes: params.durationMinutes }),
    ...(params.priceAgorot !== undefined && { priceAgorot: params.priceAgorot }),
    ...(params.vatApplicable !== undefined && { vatApplicable: params.vatApplicable }),
    ...(params.serviceType !== undefined && { serviceType: params.serviceType }),
    ...(params.availableForOnlineBooking !== undefined && {
      availableForOnlineBooking: params.availableForOnlineBooking,
    }),
    ...(params.displayOrder !== undefined && { displayOrder: params.displayOrder }),
    ...(params.depositRequired !== undefined && { depositRequired: params.depositRequired }),
    ...(params.depositType !== undefined && { depositType: params.depositType }),
    ...(params.depositValue !== undefined && { depositValue: params.depositValue }),
  });

  // updateServiceRecord returns null only if the row disappeared between the
  // findServiceById check above and the update — extremely unlikely but handled.
  if (!updated) throw new ServiceNotFoundError(id);
  return updated;
}

export async function deactivateService(
  barbershopId: string,
  id: string,
): Promise<Service> {
  const existing = await findServiceById(barbershopId, id);
  if (!existing) throw new ServiceNotFoundError(id);

  const deactivated = await deactivateServiceRecord(barbershopId, id);
  if (!deactivated) throw new ServiceNotFoundError(id);
  return deactivated;
}
