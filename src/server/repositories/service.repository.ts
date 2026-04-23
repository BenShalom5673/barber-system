import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { services } from '@/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Service = InferSelectModel<typeof services>;

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
