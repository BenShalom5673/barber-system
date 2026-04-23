/**
 * Typed domain errors for the booking engine.
 * These are thrown by services and caught at the API route layer.
 * Never throw raw Error objects from services — always use these.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ─── Customer errors ──────────────────────────────────────────────────────────

/** Customer status = 'restricted': cannot book via the online/public flow. */
export class CustomerRestrictedError extends DomainError {
  constructor(public readonly customerId: string) {
    super(
      `Customer ${customerId} is restricted and cannot book online. Manual booking by owner required.`,
    );
  }
}

/** Customer status = 'irrelevant': cannot book through any flow. */
export class CustomerIrrelevantError extends DomainError {
  constructor(public readonly customerId: string) {
    super(`Customer ${customerId} is marked irrelevant and cannot book.`);
  }
}

export class CustomerNotFoundError extends DomainError {
  constructor(public readonly customerId: string) {
    super(`Customer ${customerId} was not found.`);
  }
}

// ─── Slot / availability errors ───────────────────────────────────────────────

export class SlotNotAvailableError extends DomainError {
  constructor() {
    super('The requested time slot is no longer available.');
  }
}

export class StaffNotAvailableError extends DomainError {
  constructor() {
    super('The staff member is not available on the requested date.');
  }
}

// ─── Service / staff errors ───────────────────────────────────────────────────

export class ServiceNotFoundError extends DomainError {
  constructor(public readonly serviceId: string) {
    super(`Service ${serviceId} was not found or is not active.`);
  }
}

export class StaffNotFoundError extends DomainError {
  constructor(public readonly staffProfileId: string) {
    super(`Staff profile ${staffProfileId} was not found or is not active.`);
  }
}

export class ServiceNotOfferedByStaffError extends DomainError {
  constructor(
    public readonly staffProfileId: string,
    public readonly serviceId: string,
  ) {
    super(`Staff ${staffProfileId} does not offer service ${serviceId}.`);
  }
}

// ─── Appointment errors ───────────────────────────────────────────────────────

export class AppointmentNotFoundError extends DomainError {
  constructor(public readonly appointmentId: string) {
    super(`Appointment ${appointmentId} was not found.`);
  }
}

/**
 * Thrown when attempting to cancel or modify an appointment that is already
 * in a terminal state (cancelled, no_show, completed).
 */
export class AppointmentNotCancellableError extends DomainError {
  constructor(
    public readonly appointmentId: string,
    public readonly currentStatus: string,
  ) {
    super(
      `Appointment ${appointmentId} cannot be cancelled — current status is '${currentStatus}'.`,
    );
  }
}

export class CancellationWindowExpiredError extends DomainError {
  constructor(public readonly windowMinutes: number) {
    super(
      `Cancellation is no longer allowed within ${windowMinutes} minutes of the appointment.`,
    );
  }
}

// ─── Settings / onboarding errors ────────────────────────────────────────────

/**
 * Thrown when an operation requires a completed business profile but none exists.
 * The onboarding wizard must be completed before financial flows are enabled.
 */
export class BusinessProfileNotFoundError extends DomainError {
  constructor(public readonly barbershopId: string) {
    super(
      `No business profile found for barbershop ${barbershopId}. Onboarding must be completed first.`,
    );
  }
}

/** Thrown when attempting to create a business profile that already exists. */
export class BusinessProfileAlreadyExistsError extends DomainError {
  constructor(public readonly barbershopId: string) {
    super(`A business profile for barbershop ${barbershopId} already exists.`);
  }
}

/** Thrown when vatRate is outside the valid range (0–9999 basis points). */
export class InvalidVatRateError extends DomainError {
  constructor(public readonly vatRate: number) {
    super(
      `Invalid VAT rate: ${vatRate}. Must be an integer between 0 and 9999 basis points (e.g. 1800 = 18%).`,
    );
  }
}

/** Thrown when a no-show chargePercent value is not in the allowed set. */
export class InvalidChargePercentError extends DomainError {
  constructor(public readonly chargePercent: number) {
    super(
      `Invalid charge percent: ${chargePercent}. Allowed values are 0, 50, or 100.`,
    );
  }
}

/** Thrown when a no-show policy row has an offense_number less than 1. */
export class InvalidOffenseNumberError extends DomainError {
  constructor(public readonly offenseNumber: number) {
    super(`Invalid offense number: ${offenseNumber}. Must be a positive integer (1-based).`);
  }
}

// ─── Deposit errors ───────────────────────────────────────────────────────────

/**
 * Thrown when deposit is required but the booking was attempted without one.
 * The appointment will be created as 'pending_deposit' — this error is for
 * cases where the caller must be notified to initiate payment.
 */
export class DepositRequiredError extends DomainError {
  constructor(
    public readonly depositType: 'percentage' | 'fixed',
    public readonly depositValue: number,
  ) {
    super(
      `A deposit is required before this appointment can be confirmed. ` +
        `Type: ${depositType}, value: ${depositValue}.`,
    );
  }
}

/**
 * Thrown when deposit configuration is incomplete (deposit is required but
 * neither the service nor the barbershop settings define an amount/type).
 */
export class DepositConfigurationMissingError extends DomainError {
  constructor(public readonly barbershopId: string) {
    super(
      `Deposit is required for barbershop ${barbershopId} but no deposit amount/type is configured in settings.`,
    );
  }
}
