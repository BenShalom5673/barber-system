import {
  findAppointmentById,
  updateAppointmentStatus,
  type Appointment,
} from '@/server/repositories/appointment.repository';
import { findBarbershopSettings } from '@/server/repositories/schedule.repository';
import {
  AppointmentNotFoundError,
  AppointmentNotCancellableError,
  CancellationWindowExpiredError,
} from '@/server/errors/domain';

const DEFAULT_CANCELLATION_WINDOW_MINUTES = 180; // 3 hours

/**
 * Statuses that cannot be cancelled or transitioned.
 * An appointment in one of these states is considered terminal.
 */
const TERMINAL_STATUSES: Appointment['status'][] = ['cancelled', 'no_show', 'completed'];

export interface CancelAppointmentParams {
  barbershopId: string;
  appointmentId: string;
  reason?: string;
}

/**
 * Cancels an appointment on behalf of the client.
 *
 * Enforces the cancellation window: clients may not cancel within
 * `cancellationWindowMinutes` of the appointment start time.
 * The slot start is extracted from the slotRange lower bound.
 *
 * Sets: status = 'cancelled', cancelled_by = 'client'
 */
export async function cancelByClient(
  params: CancelAppointmentParams,
): Promise<Appointment> {
  const { barbershopId, appointmentId, reason } = params;

  const appointment = await findAppointmentById(barbershopId, appointmentId);
  if (!appointment) throw new AppointmentNotFoundError(appointmentId);
  if (TERMINAL_STATUSES.includes(appointment.status)) {
    throw new AppointmentNotCancellableError(appointmentId, appointment.status);
  }

  const settings = await findBarbershopSettings(barbershopId);
  const windowMinutes =
    settings?.cancellationWindowMinutes ?? DEFAULT_CANCELLATION_WINDOW_MINUTES;

  const slotStart = extractSlotStart(appointment.slotRange as string);
  const windowMs = windowMinutes * 60_000;

  if (slotStart.getTime() - Date.now() < windowMs) {
    throw new CancellationWindowExpiredError(windowMinutes);
  }

  return updateAppointmentStatus(barbershopId, appointmentId, 'cancelled', {
    cancelledBy: 'client',
    cancelledAt: new Date(),
    cancellationReason: reason,
  });
}

/**
 * Cancels an appointment on behalf of the owner or staff.
 * No cancellation window is enforced for owner-initiated cancellations.
 *
 * Sets: status = 'cancelled', cancelled_by = 'owner'
 */
export async function cancelByOwner(
  params: CancelAppointmentParams,
): Promise<Appointment> {
  const { barbershopId, appointmentId, reason } = params;

  const appointment = await findAppointmentById(barbershopId, appointmentId);
  if (!appointment) throw new AppointmentNotFoundError(appointmentId);
  if (TERMINAL_STATUSES.includes(appointment.status)) {
    throw new AppointmentNotCancellableError(appointmentId, appointment.status);
  }

  return updateAppointmentStatus(barbershopId, appointmentId, 'cancelled', {
    cancelledBy: 'owner',
    cancelledAt: new Date(),
    cancellationReason: reason,
  });
}

/**
 * Expires a pending_deposit appointment that was not paid within the window.
 * Called by the scheduled cron job — not exposed to users.
 *
 * Sets: status = 'cancelled', cancelled_by = 'system'
 * Does NOT increment no_show_count — the customer never confirmed.
 */
export async function cancelBySystem(
  barbershopId: string,
  appointmentId: string,
): Promise<Appointment> {
  const appointment = await findAppointmentById(barbershopId, appointmentId);
  if (!appointment) throw new AppointmentNotFoundError(appointmentId);

  // Only cancel if still in pending_deposit — guard against double-processing
  if (appointment.status !== 'pending_deposit') {
    throw new AppointmentNotCancellableError(appointmentId, appointment.status);
  }

  return updateAppointmentStatus(barbershopId, appointmentId, 'cancelled', {
    cancelledBy: 'system',
    cancelledAt: new Date(),
    cancellationReason: 'Deposit not received within the required window.',
  });
}

/**
 * Marks an appointment as no_show.
 * Only valid for appointments with status = 'confirmed'.
 * Does NOT automatically update customer.no_show_count or customer.status —
 * the no-show policy workflow handles that as a separate owner-confirmed action.
 *
 * Sets: status = 'no_show'
 * Does NOT set cancelledBy or cancelledAt — those fields are for cancellations only.
 */
export async function markAsNoShow(
  params: CancelAppointmentParams,
): Promise<Appointment> {
  const { barbershopId, appointmentId, reason } = params;

  const appointment = await findAppointmentById(barbershopId, appointmentId);
  if (!appointment) throw new AppointmentNotFoundError(appointmentId);

  if (appointment.status !== 'confirmed') {
    throw new AppointmentNotCancellableError(appointmentId, appointment.status);
  }

  return updateAppointmentStatus(barbershopId, appointmentId, 'no_show', {
    // cancellationReason is reused here as an optional internal note for no-shows
    ...(reason !== undefined && { cancellationReason: reason }),
  });
}

// ─── Private helper ───────────────────────────────────────────────────────────

/**
 * Extracts the lower bound (start time) from a PostgreSQL tstzrange string.
 * e.g. `["2026-04-23 09:00:00+00","2026-04-23 09:35:00+00")` → Date
 */
function extractSlotStart(raw: string): Date {
  const inner = raw.replace(/^[\[(]/, '');
  const commaIdx = inner.indexOf(',');
  const startStr = inner.slice(0, commaIdx).replace(/"/g, '').trim();
  return new Date(startStr);
}
