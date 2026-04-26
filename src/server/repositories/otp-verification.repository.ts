import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { otpVerifications } from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type OtpVerification = InferSelectModel<typeof otpVerifications>;
export type NewOtpVerification = InferInsertModel<typeof otpVerifications>;

export async function createOtpVerification(data: NewOtpVerification): Promise<OtpVerification> {
  const result = await db.insert(otpVerifications).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create OTP verification — no row returned.');
  return row;
}

export async function findLatestActiveOtp(
  barbershopId: string,
  phone: string,
): Promise<OtpVerification | null> {
  const result = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.barbershopId, barbershopId),
        eq(otpVerifications.phone, phone),
        sql`${otpVerifications.expiresAt} > now()`,
        sql`${otpVerifications.verifiedAt} IS NULL`,
      ),
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  return result[0] ?? null;
}

export async function markOtpVerified(id: string): Promise<OtpVerification> {
  const result = await db
    .update(otpVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(otpVerifications.id, id))
    .returning();
  const row = result[0];
  if (!row) throw new Error(`OTP verification ${id} not found during mark-verified.`);
  return row;
}

export async function incrementOtpAttemptCount(id: string): Promise<OtpVerification> {
  const result = await db
    .update(otpVerifications)
    .set({ attemptCount: sql`${otpVerifications.attemptCount} + 1` })
    .where(eq(otpVerifications.id, id))
    .returning();
  const row = result[0];
  if (!row) throw new Error(`OTP verification ${id} not found during attempt increment.`);
  return row;
}

// Called before issuing a new OTP so only one active code exists per phone at a time.
export async function expireOtpsForPhone(
  barbershopId: string,
  phone: string,
): Promise<void> {
  await db
    .update(otpVerifications)
    .set({ expiresAt: new Date() })
    .where(
      and(
        eq(otpVerifications.barbershopId, barbershopId),
        eq(otpVerifications.phone, phone),
        sql`${otpVerifications.verifiedAt} IS NULL`,
        sql`${otpVerifications.expiresAt} > now()`,
      ),
    );
}
