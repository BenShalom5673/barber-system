import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  staffWorkingHours,
  staffScheduleOverrides,
  barbershopSettings,
} from '@/server/db/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type StaffWorkingHours = InferSelectModel<typeof staffWorkingHours>;
export type StaffScheduleOverride = InferSelectModel<typeof staffScheduleOverrides>;
export type BarbershopSettings = InferSelectModel<typeof barbershopSettings>;
export type NewBarbershopSettings = InferInsertModel<typeof barbershopSettings>;

export async function findWorkingHoursForDay(
  staffProfileId: string,
  dayOfWeek: number,
): Promise<StaffWorkingHours | null> {
  const result = await db
    .select()
    .from(staffWorkingHours)
    .where(
      and(
        eq(staffWorkingHours.staffProfileId, staffProfileId),
        eq(staffWorkingHours.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Returns all overrides for a staff member on a specific date.
 * dateStr must be in YYYY-MM-DD format.
 */
export async function findOverridesForDate(
  staffProfileId: string,
  dateStr: string,
): Promise<StaffScheduleOverride[]> {
  return db
    .select()
    .from(staffScheduleOverrides)
    .where(
      and(
        eq(staffScheduleOverrides.staffProfileId, staffProfileId),
        eq(staffScheduleOverrides.overrideDate, dateStr),
      ),
    );
}

/**
 * Returns the barbershop settings row. Returns null if not yet configured
 * (callers must fall back to hardcoded defaults in that case).
 */
export async function findBarbershopSettings(
  barbershopId: string,
): Promise<BarbershopSettings | null> {
  const result = await db
    .select()
    .from(barbershopSettings)
    .where(eq(barbershopSettings.barbershopId, barbershopId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Creates the barbershop settings row for a barbershop.
 * Called once during onboarding. Throws if a row already exists.
 */
export async function createBarbershopSettings(
  data: NewBarbershopSettings,
): Promise<BarbershopSettings> {
  const result = await db.insert(barbershopSettings).values(data).returning();
  const row = result[0];
  if (!row) throw new Error('Failed to create barbershop settings — no row returned.');
  return row;
}

/**
 * Updates the barbershop settings row. All fields are optional — only
 * provided fields are written. Throws if no row exists for the barbershop.
 */
export async function updateBarbershopSettings(
  barbershopId: string,
  data: Partial<
    Omit<NewBarbershopSettings, 'id' | 'barbershopId' | 'createdAt' | 'updatedAt'>
  >,
): Promise<BarbershopSettings> {
  const result = await db
    .update(barbershopSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(barbershopSettings.barbershopId, barbershopId))
    .returning();

  const row = result[0];
  if (!row)
    throw new Error(
      `Barbershop settings for ${barbershopId} not found during update.`,
    );
  return row;
}
