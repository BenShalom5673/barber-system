import { normalisePhone } from '@/lib/slot-utils';
import {
  findCustomerByPhone,
  insertCustomerIfNotExists,
  updateCustomerProfile,
  type Customer,
} from '@/server/repositories/customer.repository';

export interface FindOrCreateCustomerParams {
  barbershopId: string;
  phone: string;
  name: string;
  email?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
}

/**
 * Looks up a customer by (barbershopId, normalised phone).
 *
 * If the customer exists: updates name, email, and birthDate with any
 * non-empty values provided. Existing values are never overwritten with
 * null or empty string.
 *
 * If the customer does not exist: inserts a new row using an
 * ON CONFLICT DO NOTHING insert. If a concurrent request wins the race,
 * falls back to a second phone lookup.
 *
 * Does NOT check customer status — the caller (booking service) enforces
 * status rules ('irrelevant', 'restricted', etc.).
 */
export async function findOrCreateCustomer(
  params: FindOrCreateCustomerParams,
): Promise<Customer> {
  const phone = normalisePhone(params.phone);

  const existing = await findCustomerByPhone(params.barbershopId, phone);
  if (existing) {
    const updates: { name?: string; email?: string; birthDate?: string } = {};
    if (params.name) updates.name = params.name;
    if (params.email) updates.email = params.email;
    if (params.birthDate) updates.birthDate = params.birthDate;

    if (Object.keys(updates).length > 0) {
      return updateCustomerProfile(params.barbershopId, existing.id, updates);
    }
    return existing;
  }

  const inserted = await insertCustomerIfNotExists({
    barbershopId: params.barbershopId,
    phone,
    name: params.name,
    email: params.email ?? null,
    birthDate: params.birthDate ?? null,
    status: 'active',
    noShowCount: 0,
    depositRequired: false,
  });
  if (inserted) return inserted;

  // Race condition: another concurrent request inserted first — re-fetch
  const raceWinner = await findCustomerByPhone(params.barbershopId, phone);
  if (raceWinner) return raceWinner;
  throw new Error('Failed to find or create customer after conflict.');
}
