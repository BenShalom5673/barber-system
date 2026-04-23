import { eq, asc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { noShowPolicies } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type NoShowPolicy = InferSelectModel<typeof noShowPolicies>;
export type NewNoShowPolicy = InferInsertModel<typeof noShowPolicies>;

/**
 * Returns all no-show policy rows for a barbershop, ordered by offense_number ascending.
 * Returns an empty array if no policy has been configured.
 */
export async function findNoShowPolicies(
  barbershopId: string,
): Promise<NoShowPolicy[]> {
  return db
    .select()
    .from(noShowPolicies)
    .where(eq(noShowPolicies.barbershopId, barbershopId))
    .orderBy(asc(noShowPolicies.offenseNumber));
}

/**
 * Replaces the entire no-show policy for a barbershop atomically.
 * Deletes all existing rows for the barbershop, then inserts the new set.
 * Callers must pass a non-empty array; an empty array clears the policy entirely.
 */
export async function replaceNoShowPolicies(
  barbershopId: string,
  rows: Array<{ offenseNumber: number; chargePercent: number }>,
): Promise<NoShowPolicy[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(noShowPolicies)
      .where(eq(noShowPolicies.barbershopId, barbershopId));

    if (rows.length === 0) return [];

    const inserted = await tx
      .insert(noShowPolicies)
      .values(rows.map((r) => ({ ...r, barbershopId })))
      .returning();

    return inserted.sort((a, b) => a.offenseNumber - b.offenseNumber);
  });
}
