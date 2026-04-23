import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { staffProfiles, staffServices } from '@/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type StaffProfile = InferSelectModel<typeof staffProfiles>;

/**
 * Finds an active staff profile by id scoped to the given barbershop.
 * Uses the direct barbershopId FK on staff_profiles — no membership join required.
 * Placeholder profiles (membershipId = null) are included as long as they are active.
 */
export async function findStaffById(
  barbershopId: string,
  staffProfileId: string,
): Promise<StaffProfile | null> {
  const result = await db
    .select()
    .from(staffProfiles)
    .where(
      and(
        eq(staffProfiles.id, staffProfileId),
        eq(staffProfiles.barbershopId, barbershopId),
        eq(staffProfiles.isActive, true),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function findActiveStaffByBarbershop(
  barbershopId: string,
): Promise<StaffProfile[]> {
  return db
    .select()
    .from(staffProfiles)
    .where(
      and(
        eq(staffProfiles.barbershopId, barbershopId),
        eq(staffProfiles.isActive, true),
      ),
    );
}

/**
 * Returns true if the staff member offers the given service.
 * Scoped by barbershopId via the direct FK on staff_profiles.
 */
export async function staffOffersService(
  barbershopId: string,
  staffProfileId: string,
  serviceId: string,
): Promise<boolean> {
  const result = await db
    .select({ staffProfileId: staffServices.staffProfileId })
    .from(staffServices)
    .innerJoin(staffProfiles, eq(staffServices.staffProfileId, staffProfiles.id))
    .where(
      and(
        eq(staffServices.staffProfileId, staffProfileId),
        eq(staffServices.serviceId, serviceId),
        eq(staffProfiles.barbershopId, barbershopId),
      ),
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Finds a staff profile by invitation email within a barbershop.
 * Used during staff registration to auto-link a new user account to their placeholder profile.
 */
export async function findStaffByInvitationEmail(
  barbershopId: string,
  email: string,
): Promise<StaffProfile | null> {
  const result = await db
    .select()
    .from(staffProfiles)
    .where(
      and(
        eq(staffProfiles.barbershopId, barbershopId),
        eq(staffProfiles.invitationEmail, email),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Links an existing placeholder staff profile to a membership after the staff
 * member registers. Clears invitationEmail once linked.
 */
export async function linkStaffProfileToMembership(
  staffProfileId: string,
  membershipId: string,
): Promise<StaffProfile> {
  const result = await db
    .update(staffProfiles)
    .set({ membershipId, invitationEmail: null, updatedAt: new Date() })
    .where(eq(staffProfiles.id, staffProfileId))
    .returning();

  const row = result[0];
  if (!row) throw new Error(`Staff profile ${staffProfileId} not found during membership link.`);
  return row;
}
