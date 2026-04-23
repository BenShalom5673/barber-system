import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { appointments } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Appointment = InferSelectModel<typeof appointments>;
export type NewAppointment = InferInsertModel<typeof appointments>;

export async function findAppointmentById(
  barbershopId: string,
  id: string,
): Promise<Appointment | null> {
  const result = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.barbershopId, barbershopId)))
    .limit(1);

  return result[0] ?? null;
}

export async function createAppointment(data: NewAppointment): Promise<Appointment> {
  const result = await db.insert(appointments).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create appointment — no row returned.');
  return row;
}

/**
 * Returns all slot-blocking appointments for a staff member whose slot_range
 * overlaps with [windowStart, windowEnd).
 *
 * Excluded from blocking (these statuses do not hold the slot):
 *   'cancelled' — released regardless of who cancelled or how
 *   'no_show'   — slot is retrospectively freed
 *
 * 'pending_deposit' IS included — it holds the slot until paid or expired.
 *
 * Uses raw SQL `&&` (tstzrange overlap) because Drizzle ORM has no built-in
 * tstzrange expression helpers.
 */
export async function findActiveAppointmentsForStaffInWindow(
  staffProfileId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<Appointment[]> {
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.staffProfileId, staffProfileId),
        sql`${appointments.slotRange} && tstzrange(
          ${windowStart.toISOString()}::timestamptz,
          ${windowEnd.toISOString()}::timestamptz,
          '[)'
        )`,
        sql`${appointments.status} NOT IN ('cancelled', 'no_show')`,
      ),
    );
}

/**
 * Finds all pending_deposit appointments older than the given cutoff.
 * Used by the expiry cron job to identify appointments to auto-cancel.
 */
export async function findExpiredPendingDepositAppointments(
  cutoffDate: Date,
): Promise<Appointment[]> {
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'pending_deposit'),
        sql`${appointments.createdAt} < ${cutoffDate.toISOString()}::timestamptz`,
      ),
    );
}

export interface UpdateAppointmentStatusExtra {
  cancelledBy?: Appointment['cancelledBy'];
  cancelledAt?: Date;
  cancellationReason?: string;
  paymentStatus?: Appointment['paymentStatus'];
}

export async function updateAppointmentStatus(
  barbershopId: string,
  id: string,
  status: Appointment['status'],
  extra?: UpdateAppointmentStatusExtra,
): Promise<Appointment> {
  const result = await db
    .update(appointments)
    .set({
      status,
      updatedAt: new Date(),
      ...(extra?.cancelledBy !== undefined && { cancelledBy: extra.cancelledBy }),
      ...(extra?.cancelledAt !== undefined && { cancelledAt: extra.cancelledAt }),
      ...(extra?.cancellationReason !== undefined && {
        cancellationReason: extra.cancellationReason,
      }),
      ...(extra?.paymentStatus !== undefined && { paymentStatus: extra.paymentStatus }),
    })
    .where(and(eq(appointments.id, id), eq(appointments.barbershopId, barbershopId)))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Appointment ${id} not found during status update.`);
  return row;
}

export async function updateAppointmentPaymentStatus(
  barbershopId: string,
  id: string,
  paymentStatus: Appointment['paymentStatus'],
): Promise<Appointment> {
  const result = await db
    .update(appointments)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.barbershopId, barbershopId)))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Appointment ${id} not found during payment status update.`);
  return row;
}
