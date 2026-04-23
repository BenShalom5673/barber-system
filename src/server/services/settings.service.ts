import {
  findBusinessProfile,
  createBusinessProfile,
  updateBusinessProfile,
  type BusinessProfile,
} from '@/server/repositories/business-profile.repository';
import {
  findBarbershopSettings,
  createBarbershopSettings,
  updateBarbershopSettings,
  type BarbershopSettings,
} from '@/server/repositories/schedule.repository';
import {
  findNoShowPolicies,
  replaceNoShowPolicies,
  type NoShowPolicy,
} from '@/server/repositories/no-show-policy.repository';
import {
  BusinessProfileNotFoundError,
  BusinessProfileAlreadyExistsError,
  InvalidVatRateError,
  InvalidChargePercentError,
  InvalidOffenseNumberError,
} from '@/server/errors/domain';

// ─── Allowed values ────────────────────────────────────────────────────────────

/**
 * Allowed chargePercent values for no-show policy rows in V1.
 * 0 = warning only, 50 = half charge, 100 = full charge.
 */
const ALLOWED_CHARGE_PERCENTS = [0, 50, 100] as const;
type AllowedChargePercent = (typeof ALLOWED_CHARGE_PERCENTS)[number];

// ─── Param types ──────────────────────────────────────────────────────────────

export interface CreateBusinessProfileParams {
  barbershopId: string;
  name: string;
  address: string;
  phone: string;
  businessType: BusinessProfile['businessType'];
  vatRate: number;
  timezone?: string;
  registrationNumber?: string;
  vatNumber?: string;
  accountantEmail?: string;
}

export interface UpdateBusinessProfileParams {
  name?: string;
  address?: string;
  phone?: string;
  businessType?: BusinessProfile['businessType'];
  vatRate?: number;
  timezone?: string;
  registrationNumber?: string;
  vatNumber?: string;
  accountantEmail?: string;
}

export interface SaveOperationalSettingsParams {
  barbershopId: string;
  cancellationWindowMinutes?: number;
  appointmentBufferMinutes?: number;
  bookingHorizonDays?: number;
  slotIntervalMinutes?: number;
  isOnlineBookingEnabled?: boolean;
  // Deposit fields
  defaultDepositType?: BarbershopSettings['defaultDepositType'];
  defaultDepositValue?: number;
  pendingDepositExpiryMinutes?: number;
  depositRequiredForOnlineBookings?: boolean;
  depositRequiredAfterNoShowCount?: number | null;
  depositRequiredForRestrictedCustomers?: boolean;
}

export interface NoShowPolicyRow {
  offenseNumber: number;
  chargePercent: AllowedChargePercent;
}

// ─── Business profile ─────────────────────────────────────────────────────────

/**
 * Creates the initial business profile during onboarding.
 * Throws BusinessProfileAlreadyExistsError if called a second time.
 * businessType and vatRate are required and validated before insert.
 */
export async function createInitialBusinessProfile(
  params: CreateBusinessProfileParams,
): Promise<BusinessProfile> {
  const existing = await findBusinessProfile(params.barbershopId);
  if (existing) throw new BusinessProfileAlreadyExistsError(params.barbershopId);

  validateVatRate(params.vatRate);

  return createBusinessProfile({
    barbershopId: params.barbershopId,
    name: params.name,
    address: params.address,
    phone: params.phone,
    businessType: params.businessType,
    vatRate: params.vatRate,
    timezone: params.timezone ?? 'Asia/Jerusalem',
    registrationNumber: params.registrationNumber ?? null,
    vatNumber: params.vatNumber ?? null,
    accountantEmail: params.accountantEmail ?? null,
  });
}

/**
 * Updates an existing business profile.
 * Throws BusinessProfileNotFoundError if no profile exists yet.
 * vatRate is validated if provided.
 */
export async function updateExistingBusinessProfile(
  barbershopId: string,
  params: UpdateBusinessProfileParams,
): Promise<BusinessProfile> {
  const existing = await findBusinessProfile(barbershopId);
  if (!existing) throw new BusinessProfileNotFoundError(barbershopId);

  if (params.vatRate !== undefined) {
    validateVatRate(params.vatRate);
  }

  return updateBusinessProfile(barbershopId, {
    ...(params.name !== undefined && { name: params.name }),
    ...(params.address !== undefined && { address: params.address }),
    ...(params.phone !== undefined && { phone: params.phone }),
    ...(params.businessType !== undefined && { businessType: params.businessType }),
    ...(params.vatRate !== undefined && { vatRate: params.vatRate }),
    ...(params.timezone !== undefined && { timezone: params.timezone }),
    ...(params.registrationNumber !== undefined && {
      registrationNumber: params.registrationNumber,
    }),
    ...(params.vatNumber !== undefined && { vatNumber: params.vatNumber }),
    ...(params.accountantEmail !== undefined && { accountantEmail: params.accountantEmail }),
  });
}

/**
 * Returns the business profile for the given barbershop.
 * Throws BusinessProfileNotFoundError if onboarding has not been completed.
 * Use this in any flow that requires a completed business identity.
 */
export async function requireBusinessProfile(
  barbershopId: string,
): Promise<BusinessProfile> {
  const profile = await findBusinessProfile(barbershopId);
  if (!profile) throw new BusinessProfileNotFoundError(barbershopId);
  return profile;
}

// ─── Operational settings ─────────────────────────────────────────────────────

/**
 * Saves (upserts) the operational settings for a barbershop.
 * Creates the settings row on first call; updates it on subsequent calls.
 * All fields are optional — only provided fields are written on update.
 */
export async function saveOperationalSettings(
  params: SaveOperationalSettingsParams,
): Promise<BarbershopSettings> {
  const { barbershopId, ...fields } = params;

  const existing = await findBarbershopSettings(barbershopId);

  if (!existing) {
    return createBarbershopSettings({
      barbershopId,
      cancellationWindowMinutes: fields.cancellationWindowMinutes ?? 180,
      appointmentBufferMinutes: fields.appointmentBufferMinutes ?? 5,
      bookingHorizonDays: fields.bookingHorizonDays ?? 30,
      slotIntervalMinutes: fields.slotIntervalMinutes ?? 15,
      isOnlineBookingEnabled: fields.isOnlineBookingEnabled ?? true,
      defaultDepositType: fields.defaultDepositType ?? null,
      defaultDepositValue: fields.defaultDepositValue ?? null,
      pendingDepositExpiryMinutes: fields.pendingDepositExpiryMinutes ?? 30,
      depositRequiredForOnlineBookings: fields.depositRequiredForOnlineBookings ?? false,
      depositRequiredAfterNoShowCount: fields.depositRequiredAfterNoShowCount ?? null,
      depositRequiredForRestrictedCustomers:
        fields.depositRequiredForRestrictedCustomers ?? true,
    });
  }

  return updateBarbershopSettings(barbershopId, {
    ...(fields.cancellationWindowMinutes !== undefined && {
      cancellationWindowMinutes: fields.cancellationWindowMinutes,
    }),
    ...(fields.appointmentBufferMinutes !== undefined && {
      appointmentBufferMinutes: fields.appointmentBufferMinutes,
    }),
    ...(fields.bookingHorizonDays !== undefined && {
      bookingHorizonDays: fields.bookingHorizonDays,
    }),
    ...(fields.slotIntervalMinutes !== undefined && {
      slotIntervalMinutes: fields.slotIntervalMinutes,
    }),
    ...(fields.isOnlineBookingEnabled !== undefined && {
      isOnlineBookingEnabled: fields.isOnlineBookingEnabled,
    }),
    ...(fields.defaultDepositType !== undefined && {
      defaultDepositType: fields.defaultDepositType,
    }),
    ...(fields.defaultDepositValue !== undefined && {
      defaultDepositValue: fields.defaultDepositValue,
    }),
    ...(fields.pendingDepositExpiryMinutes !== undefined && {
      pendingDepositExpiryMinutes: fields.pendingDepositExpiryMinutes,
    }),
    ...(fields.depositRequiredForOnlineBookings !== undefined && {
      depositRequiredForOnlineBookings: fields.depositRequiredForOnlineBookings,
    }),
    ...(fields.depositRequiredAfterNoShowCount !== undefined && {
      depositRequiredAfterNoShowCount: fields.depositRequiredAfterNoShowCount,
    }),
    ...(fields.depositRequiredForRestrictedCustomers !== undefined && {
      depositRequiredForRestrictedCustomers: fields.depositRequiredForRestrictedCustomers,
    }),
  });
}

// ─── No-show policy ───────────────────────────────────────────────────────────

/**
 * Returns the no-show policy for a barbershop, ordered by offense_number.
 * Returns an empty array if no policy has been configured.
 */
export async function getNoShowPolicy(barbershopId: string): Promise<NoShowPolicy[]> {
  return findNoShowPolicies(barbershopId);
}

/**
 * Replaces the entire no-show policy for a barbershop.
 * Validates all rows before any DB writes.
 *
 * Validation rules:
 *   - offenseNumber must be >= 1
 *   - offenseNumber values must be unique within the submitted set
 *   - chargePercent must be one of: 0, 50, 100
 *
 * An empty array clears the policy (no charges on any no-show).
 */
export async function saveNoShowPolicy(
  barbershopId: string,
  rows: NoShowPolicyRow[],
): Promise<NoShowPolicy[]> {
  validateNoShowPolicyRows(rows);
  return replaceNoShowPolicies(barbershopId, rows);
}

// ─── Onboarding status ────────────────────────────────────────────────────────

export interface OnboardingStatus {
  businessProfileComplete: boolean;
  operationalSettingsComplete: boolean;
  noShowPolicyConfigured: boolean;
  /** true when businessProfileComplete is true — required before financial flows */
  financialFlowsEnabled: boolean;
}

/**
 * Returns a snapshot of the onboarding completion state for a barbershop.
 * financialFlowsEnabled is gated on businessProfileComplete because
 * VAT rate and business type are required for document/payment generation.
 */
export async function getOnboardingStatus(
  barbershopId: string,
): Promise<OnboardingStatus> {
  const [profile, settings, policies] = await Promise.all([
    findBusinessProfile(barbershopId),
    findBarbershopSettings(barbershopId),
    findNoShowPolicies(barbershopId),
  ]);

  const businessProfileComplete = profile !== null;

  return {
    businessProfileComplete,
    operationalSettingsComplete: settings !== null,
    noShowPolicyConfigured: policies.length > 0,
    financialFlowsEnabled: businessProfileComplete,
  };
}

// ─── Private validators ───────────────────────────────────────────────────────

/**
 * vatRate is stored as basis points (integer).
 * Valid range: 0 (exempt) to 9999 (99.99%).
 * Must be a safe integer.
 */
function validateVatRate(vatRate: number): void {
  if (!Number.isInteger(vatRate) || vatRate < 0 || vatRate > 9999) {
    throw new InvalidVatRateError(vatRate);
  }
}

function validateNoShowPolicyRows(rows: NoShowPolicyRow[]): void {
  const seenOffenseNumbers = new Set<number>();

  for (const row of rows) {
    if (!Number.isInteger(row.offenseNumber) || row.offenseNumber < 1) {
      throw new InvalidOffenseNumberError(row.offenseNumber);
    }
    if (seenOffenseNumbers.has(row.offenseNumber)) {
      throw new InvalidOffenseNumberError(row.offenseNumber);
    }
    seenOffenseNumbers.add(row.offenseNumber);

    if (!(ALLOWED_CHARGE_PERCENTS as ReadonlyArray<number>).includes(row.chargePercent)) {
      throw new InvalidChargePercentError(row.chargePercent);
    }
  }
}
