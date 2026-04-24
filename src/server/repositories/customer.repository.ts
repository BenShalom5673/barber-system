import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { customers } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Customer = InferSelectModel<typeof customers>;
export type NewCustomer = InferInsertModel<typeof customers>;

export async function findCustomerByPhone(
  barbershopId: string,
  phone: string,
): Promise<Customer | null> {
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.barbershopId, barbershopId), eq(customers.phone, phone)))
    .limit(1);

  return result[0] ?? null;
}

export async function findCustomerById(
  barbershopId: string,
  id: string,
): Promise<Customer | null> {
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.barbershopId, barbershopId)))
    .limit(1);

  return result[0] ?? null;
}

export async function createCustomer(data: NewCustomer): Promise<Customer> {
  const result = await db.insert(customers).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create customer — no row returned.');
  return row;
}

/**
 * Inserts a customer row, silently ignoring a UNIQUE(barbershop_id, phone) conflict.
 * Returns the newly inserted row, or null if a row with that phone already existed.
 * Callers must fall back to findCustomerByPhone on a null return.
 */
export async function insertCustomerIfNotExists(data: NewCustomer): Promise<Customer | null> {
  const result = await db.insert(customers).values(data).onConflictDoNothing().returning();
  return result[0] ?? null;
}

/**
 * Updates mutable profile fields (name, email, birthDate) on an existing customer.
 * Only fields included in data are written. Callers must filter out empty/null values
 * before calling — this function writes exactly what it receives.
 */
export async function updateCustomerProfile(
  barbershopId: string,
  id: string,
  data: { name?: string; email?: string; birthDate?: string },
): Promise<Customer> {
  const result = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.barbershopId, barbershopId)))
    .returning();
  const row = result[0];
  if (!row) throw new Error(`Customer ${id} not found during profile update.`);
  return row;
}

export async function updateCustomerStatus(
  barbershopId: string,
  id: string,
  status: Customer['status'],
): Promise<Customer> {
  const result = await db
    .update(customers)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.barbershopId, barbershopId)))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Customer ${id} not found during status update.`);
  return row;
}

export async function updateCustomerDepositRequired(
  barbershopId: string,
  id: string,
  depositRequired: boolean,
): Promise<Customer> {
  const result = await db
    .update(customers)
    .set({ depositRequired, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.barbershopId, barbershopId)))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Customer ${id} not found during deposit flag update.`);
  return row;
}

/**
 * Atomically increments no_show_count and records last_no_show_at.
 * Returns the updated customer row.
 */
export async function incrementCustomerNoShowCount(
  barbershopId: string,
  id: string,
): Promise<Customer> {
  const result = await db
    .update(customers)
    .set({
      noShowCount: sql`${customers.noShowCount} + 1`,
      lastNoShowAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, id), eq(customers.barbershopId, barbershopId)))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Customer ${id} not found during no-show increment.`);
  return row;
}
