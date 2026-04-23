import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { services } from '@/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Service = InferSelectModel<typeof services>;
export type NewService = InferInsertModel<typeof services>;

export async function findServiceById(
  barbershopId: string,
  id: string,
): Promise<Service | null> {
  const result = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, id),
        eq(services.barbershopId, barbershopId),
        eq(services.isActive, true),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function findActiveServicesByBarbershop(
  barbershopId: string,
): Promise<Service[]> {
  return db
    .select()
    .from(services)
    .where(and(eq(services.barbershopId, barbershopId), eq(services.isActive, true)))
    .orderBy(services.displayOrder);
}

export async function createService(data: NewService): Promise<Service> {
  const result = await db.insert(services).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create service — no row returned.');
  return row;
}

export async function updateService(
  barbershopId: string,
  id: string,
  data: Partial<
    Pick<
      NewService,
      | 'name'
      | 'nameHe'
      | 'description'
      | 'descriptionHe'
      | 'durationMinutes'
      | 'priceAgorot'
      | 'vatApplicable'
      | 'serviceType'
      | 'availableForOnlineBooking'
      | 'displayOrder'
      | 'depositRequired'
      | 'depositType'
      | 'depositValue'
    >
  >,
): Promise<Service | null> {
  const result = await db
    .update(services)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.barbershopId, barbershopId),
        eq(services.isActive, true),
      ),
    )
    .returning();

  return result[0] ?? null;
}

export async function deactivateService(
  barbershopId: string,
  id: string,
): Promise<Service | null> {
  const result = await db
    .update(services)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.barbershopId, barbershopId),
        eq(services.isActive, true),
      ),
    )
    .returning();

  return result[0] ?? null;
}
