import { toTstzrange } from '@/lib/slot-utils';
import { findCustomerById } from '@/server/repositories/customer.repository';
import { findServiceById } from '@/server/repositories/service.repository';
import { findStaffById, findActiveStaffForService } from '@/server/repositories/staff.repository';
import { findBarbershopSettings } from '@/server/repositories/schedule.repository';
import {
  createAppointment,
  type Appointment,
} from '@/server/repositories/appointment.repository';
import { getAvailableSlots } from './availability.service';
import { findOrCreateCustomer } from './customer.service';
import {
  CustomerRestrictedError,
  CustomerIrrelevantError,
  CustomerNotFoundError,
  ServiceNotFoundError,
  StaffNotFoundError,
  SlotNotAvailableError,
  ServiceNotOfferedByStaffError,
  DepositConfigurationMissingError,
} from '@/server/errors/domain';
import type { BarbershopSettings } from '@/server/repositories/schedule.repository';
import type { Service } from '@/server/repositories/service.repository';
import type { Customer } from '@/server/repositories/customer.repository';

const DEFAULT_BUFFER_MINUTES = 5;
// Must match the timezone assumption in availability.service
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface BookAppointmentParams {
  barbershopId: string;
  staffProfileId: string;
  serviceId: string;
  /** Local ISO with offset, e.g. "2026-04-26T12:00:00+03:00" */
  start: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** YYYY-MM-DD */
  customerBirthDate?: string;
  clientNotes?: string;
}

export interface CreateBookingParams {
  barbershopId: string;
  customerId: string;
  staffProfileId: string;
  serviceId: string;
  /** UTC Date representing the desired slot start time */
  slotStart: Date;
  clientNotes?: string;
  /** 'online' = public booking flow; 'manual' = owner/staff via Calendar */
  createdVia: 'online' | 'manual';
}

export interface DepositConfig {
  type: 'percentage' | 'fixed';
  /** Percent integer (e.g. 30) for 'percentage'; agorot for 'fixed' */
  value: number;
}

// ─── Public entry point (online booking flow) ─────────────────────────────────

/**
 * Resolves or creates the customer by phone number, then delegates to
 * createBooking. The incoming start string (local ISO with offset) is parsed
 * to the correct UTC instant by the JS Date constructor before being passed
 * deeper — no manual offset arithmetic required.
 */
export async function bookAppointment(
  params: BookAppointmentParams,
): Promise<{ appointment: Appointment; depositConfig: DepositConfig | null }> {
  // JS Date constructor correctly converts any ISO-with-offset string to a UTC instant.
  // "2026-04-26T12:00:00+03:00" → internally 2026-04-26T09:00:00.000Z
  const slotStart = new Date(params.start);

  const customer = await findOrCreateCustomer({
    barbershopId: params.barbershopId,
    phone: params.customerPhone,
    name: params.customerName,
    ...(params.customerEmail !== undefined && { email: params.customerEmail }),
    ...(params.customerBirthDate !== undefined && { birthDate: params.customerBirthDate }),
  });

  return createBooking({
    barbershopId: params.barbershopId,
    customerId: customer.id,
    staffProfileId: params.staffProfileId,
    serviceId: params.serviceId,
    slotStart,
    createdVia: 'online',
    ...(params.clientNotes !== undefined && { clientNotes: params.clientNotes }),
  });
}

// ─── Core booking logic ───────────────────────────────────────────────────────

/**
 * Creates an appointment after validating all constraints.
 *
 * Status on creation:
 *   - 'pending_deposit' when a deposit is required (determined by resolveDepositConfig)
 *   - 'confirmed' otherwise
 *
 * Validation order:
 * 1. Customer exists.
 * 2. Customer status allows booking in this context (online vs manual).
 * 3. Service exists and is active.
 * 4. Staff exists and is active.
 * 5. Staff offers the requested service (per-staff assignment rule).
 * 6. Slot is still available.
 * 7. Deposit configuration resolved.
 *
 * The DB-level GiST exclusion constraint is the final race-condition safety net.
 * A constraint violation on insert must be caught by the caller and mapped to 409.
 *
 * Immutable booking snapshots (price, duration, service name) are copied from
 * the service record at insert time and never updated.
 */
export async function createBooking(
  params: CreateBookingParams,
): Promise<{ appointment: Appointment; depositConfig: DepositConfig | null }> {
  const {
    barbershopId,
    customerId,
    staffProfileId,
    serviceId,
    slotStart,
    clientNotes,
    createdVia,
  } = params;

  // 1. Customer exists
  const customer = await findCustomerById(barbershopId, customerId);
  if (!customer) throw new CustomerNotFoundError(customerId);

  // 2. Customer status check
  validateCustomerCanBook(customer, createdVia);

  // 3. Service
  const service = await findServiceById(barbershopId, serviceId);
  if (!service) throw new ServiceNotFoundError(serviceId);

  // 4. Staff
  const staff = await findStaffById(barbershopId, staffProfileId);
  if (!staff) throw new StaffNotFoundError(staffProfileId);

  // 5. Staff ↔ service pairing — uses same "no rows = all services" rule as availability engine
  const eligibleStaff = await findActiveStaffForService(barbershopId, serviceId);
  if (!eligibleStaff.some((s) => s.id === staffProfileId)) {
    throw new ServiceNotOfferedByStaffError(staffProfileId, serviceId);
  }

  // 6. Slot availability — re-check just before insert
  // Extract the local date in barbershop timezone (not UTC) to pass to getAvailableSlots.
  // new Date(s.start) correctly parses the local-ISO-with-offset returned by the
  // availability engine back to a UTC instant for timestamp comparison.
  const localDate = extractLocalDate(slotStart, DEFAULT_TIMEZONE);
  const slotsResult = await getAvailableSlots({ barbershopId, staffProfileId, serviceId, date: localDate });
  const availableSlots = slotsResult.mode === 'specific_staff' ? slotsResult.slots : [];
  const isAvailable = availableSlots.some(
    (s) => new Date(s.start).getTime() === slotStart.getTime(),
  );
  if (!isAvailable) throw new SlotNotAvailableError();

  // 7. Resolve deposit config and determine initial status
  const settings = await findBarbershopSettings(barbershopId);
  const bufferMinutes = settings?.appointmentBufferMinutes ?? DEFAULT_BUFFER_MINUTES;

  const depositConfig = resolveDepositConfig({
    customer,
    service,
    settings,
    createdVia,
  });

  const initialStatus: Appointment['status'] = depositConfig ? 'pending_deposit' : 'confirmed';

  // Compute slot end — buffer included in range for exclusion constraint, not exposed to clients
  const slotEnd = new Date(
    slotStart.getTime() + (service.durationMinutes + bufferMinutes) * 60_000,
  );

  // Insert — DB exclusion constraint provides the race-condition safety net
  const appointment = await createAppointment({
    barbershopId,
    customerId,
    staffProfileId,
    serviceId,
    priceAtBookingAgorot: service.priceAgorot,
    durationAtBookingMinutes: service.durationMinutes,
    serviceNameAtBooking: service.name,
    slotRange: toTstzrange(slotStart, slotEnd),
    status: initialStatus,
    paymentStatus: 'unpaid',
    clientNotes: clientNotes ?? null,
    internalNotes: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    createdVia,
  });

  return { appointment, depositConfig };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Validates that the customer is allowed to book in the given context.
 *
 * Rules:
 *   'irrelevant' — blocked in all contexts
 *   'restricted' — blocked in online flow; allowed in manual (owner override)
 *   'active' / 'vacation' — allowed (vacation is informational only)
 */
function validateCustomerCanBook(
  customer: Customer,
  createdVia: 'online' | 'manual',
): void {
  if (customer.status === 'irrelevant') {
    throw new CustomerIrrelevantError(customer.id);
  }
  if (customer.status === 'restricted' && createdVia === 'online') {
    throw new CustomerRestrictedError(customer.id);
  }
}

/**
 * Resolves whether a deposit is required for this booking and what the
 * deposit amount/type should be.
 *
 * Cascade order:
 * 1. Service-level override (depositRequired = true with type + value set)
 * 2. Barbershop-level triggers (online booking flag, customer.depositRequired,
 *    restricted customer policy) → use defaultDepositType + defaultDepositValue
 *
 * Returns null when no deposit is required.
 * Throws DepositConfigurationMissingError when deposit is required but
 * the configuration is incomplete.
 */
function resolveDepositConfig({
  customer,
  service,
  settings,
  createdVia,
}: {
  customer: Customer;
  service: Service;
  settings: BarbershopSettings | null;
  createdVia: 'online' | 'manual';
}): DepositConfig | null {
  // Service-level deposit override takes highest priority
  if (service.depositRequired && service.depositType && service.depositValue !== null) {
    return { type: service.depositType, value: service.depositValue };
  }

  // Determine whether any barbershop-level trigger fires
  const onlineBookingTrigger =
    createdVia === 'online' && (settings?.depositRequiredForOnlineBookings ?? false);

  const customerDepositFlag = customer.depositRequired;

  const restrictedTrigger =
    customer.status === 'restricted' &&
    (settings?.depositRequiredForRestrictedCustomers ?? true);

  const depositTriggered = onlineBookingTrigger || customerDepositFlag || restrictedTrigger;

  if (!depositTriggered) return null;

  // A trigger fired — resolve the barbershop default amount
  if (settings?.defaultDepositType && settings.defaultDepositValue !== null) {
    return {
      type: settings.defaultDepositType,
      value: settings.defaultDepositValue!,
    };
  }

  // Service has depositRequired but incomplete config (no type/value)
  if (service.depositRequired) {
    throw new DepositConfigurationMissingError(customer.barbershopId);
  }

  // Barbershop trigger fired but no default configured
  throw new DepositConfigurationMissingError(customer.barbershopId);
}

/**
 * Returns the YYYY-MM-DD date string as observed in the given IANA timezone.
 * Used to extract the correct local date from a UTC instant before querying
 * the availability engine — avoids the UTC-midnight rollover problem.
 */
function extractLocalDate(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
