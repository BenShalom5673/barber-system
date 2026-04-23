import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { businessProfiles } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type BusinessProfile = InferSelectModel<typeof businessProfiles>;
export type NewBusinessProfile = InferInsertModel<typeof businessProfiles>;

export async function findBusinessProfile(
  barbershopId: string,
): Promise<BusinessProfile | null> {
  const result = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.barbershopId, barbershopId))
    .limit(1);

  return result[0] ?? null;
}

export async function createBusinessProfile(
  data: NewBusinessProfile,
): Promise<BusinessProfile> {
  const result = await db.insert(businessProfiles).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create business profile — no row returned.');
  return row;
}

export async function updateBusinessProfile(
  barbershopId: string,
  data: Partial<
    Omit<NewBusinessProfile, 'id' | 'barbershopId' | 'createdAt' | 'updatedAt'>
  >,
): Promise<BusinessProfile> {
  const result = await db
    .update(businessProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(businessProfiles.barbershopId, barbershopId))
    .returning();

  const row = result[0];
  if (!row)
    throw new Error(
      `Business profile for barbershop ${barbershopId} not found during update.`,
    );
  return row;
}
