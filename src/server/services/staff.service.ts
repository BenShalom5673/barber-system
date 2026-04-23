import {
  findActiveStaffByBarbershop,
  findStaffById,
  createStaffProfile,
  updateStaffProfile,
  deactivateStaffProfile,
  type StaffProfile,
} from '@/server/repositories/staff.repository';
import { StaffNotFoundError } from '@/server/errors/domain';

// ─── Param types ──────────────────────────────────────────────────────────────

export interface CreateStaffParams {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  /** Optional: set when creating a placeholder before the staff member has an account. */
  invitationEmail?: string;
}

export interface UpdateStaffParams {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  invitationEmail?: string;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Returns all active staff profiles for the barbershop.
 */
export async function listStaff(barbershopId: string): Promise<StaffProfile[]> {
  return findActiveStaffByBarbershop(barbershopId);
}

/**
 * Creates a new staff profile for the barbershop.
 * displayName is required. All other fields are optional.
 * membershipId is left null — it is populated later via linkStaffProfileToMembership
 * when the staff member registers an account.
 */
export async function createStaff(
  barbershopId: string,
  params: CreateStaffParams,
): Promise<StaffProfile> {
  return createStaffProfile({
    barbershopId,
    displayName: params.displayName,
    bio: params.bio ?? null,
    avatarUrl: params.avatarUrl ?? null,
    invitationEmail: params.invitationEmail ?? null,
    membershipId: null,
    isActive: true,
  });
}

/**
 * Updates editable fields on an active staff profile.
 * Throws StaffNotFoundError if no active profile exists with that id.
 * Only provided fields are written — undefined fields are left unchanged.
 */
export async function updateStaff(
  barbershopId: string,
  id: string,
  params: UpdateStaffParams,
): Promise<StaffProfile> {
  const existing = await findStaffById(barbershopId, id);
  if (!existing) throw new StaffNotFoundError(id);

  const updated = await updateStaffProfile(barbershopId, id, {
    ...(params.displayName !== undefined && { displayName: params.displayName }),
    ...(params.bio !== undefined && { bio: params.bio }),
    ...(params.avatarUrl !== undefined && { avatarUrl: params.avatarUrl }),
    ...(params.invitationEmail !== undefined && { invitationEmail: params.invitationEmail }),
  });

  // updateStaffProfile returns null only if the row disappeared between the
  // findStaffById check above and the update — extremely unlikely but handled.
  if (!updated) throw new StaffNotFoundError(id);
  return updated;
}

/**
 * Soft-deletes a staff profile by setting isActive = false.
 * The row is retained — historical appointments reference this profile.
 * Throws StaffNotFoundError if the profile does not exist or is already inactive.
 */
export async function deactivateStaff(
  barbershopId: string,
  id: string,
): Promise<StaffProfile> {
  const existing = await findStaffById(barbershopId, id);
  if (!existing) throw new StaffNotFoundError(id);

  const deactivated = await deactivateStaffProfile(barbershopId, id);
  if (!deactivated) throw new StaffNotFoundError(id);
  return deactivated;
}
