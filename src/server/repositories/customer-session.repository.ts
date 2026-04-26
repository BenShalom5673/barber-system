// customer_sessions has no revokedAt column — revoke operations delete rows.
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { customerSessions } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type CustomerSession = InferSelectModel<typeof customerSessions>;
export type NewCustomerSession = InferInsertModel<typeof customerSessions>;

export async function createCustomerSession(data: NewCustomerSession): Promise<CustomerSession> {
  const result = await db.insert(customerSessions).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create customer session — no row returned.');
  return row;
}

export async function findActiveSession(
  barbershopId: string,
  sessionId: string,
): Promise<CustomerSession | null> {
  const result = await db
    .select()
    .from(customerSessions)
    .where(
      and(
        eq(customerSessions.id, sessionId),
        eq(customerSessions.barbershopId, barbershopId),
        sql`${customerSessions.expiresAt} > now()`,
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// Links a verified phone session to a customer row after profile completion.
// customerId is nullable in the schema until this call.
export async function attachCustomerToSession(
  barbershopId: string,
  sessionId: string,
  customerId: string,
): Promise<CustomerSession> {
  const result = await db
    .update(customerSessions)
    .set({ customerId })
    .where(
      and(
        eq(customerSessions.id, sessionId),
        eq(customerSessions.barbershopId, barbershopId),
      ),
    )
    .returning();
  const row = result[0];
  if (!row) throw new Error(`Session ${sessionId} not found during customer attach.`);
  return row;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db
    .delete(customerSessions)
    .where(eq(customerSessions.id, sessionId));
}

// Revokes all sessions for a phone within a barbershop.
// Useful on re-verification (invalidate prior sessions) or logout-all.
export async function revokeAllSessionsForPhone(
  barbershopId: string,
  phone: string,
): Promise<void> {
  await db
    .delete(customerSessions)
    .where(
      and(
        eq(customerSessions.barbershopId, barbershopId),
        eq(customerSessions.phone, phone),
      ),
    );
}
