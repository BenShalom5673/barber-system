import {
  deleteWorkingHoursForStaff,
  insertWorkingHours,
  type StaffWorkingHours,
  type NewStaffWorkingHours,
} from '@/server/repositories/schedule.repository';
import { findStaffById } from '@/server/repositories/staff.repository';
import { StaffNotFoundError } from '@/server/errors/domain';

export interface WorkingHoursEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function setWeeklySchedule(
  barbershopId: string,
  staffProfileId: string,
  schedule: WorkingHoursEntry[],
): Promise<StaffWorkingHours[]> {
  const staff = await findStaffById(barbershopId, staffProfileId);
  if (!staff) throw new StaffNotFoundError(staffProfileId);

  await deleteWorkingHoursForStaff(staffProfileId);

  if (schedule.length === 0) return [];

  const rows: NewStaffWorkingHours[] = schedule.map((entry) => ({
    staffProfileId,
    dayOfWeek: entry.dayOfWeek,
    startTime: normalizeTime(entry.startTime),
    endTime: normalizeTime(entry.endTime),
  }));

  return insertWorkingHours(rows);
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}
