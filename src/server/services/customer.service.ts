import { normalisePhone } from '@/lib/slot-utils';
import {
  findCustomerByPhone,
  createCustomer,
  type Customer,
} from '@/server/repositories/customer.repository';

export interface FindOrCreateCustomerParams {
  barbershopId: string;
  phone: string;
  name: string;
  email?: string;
}

/**
 * Looks up a customer by (barbershopId, normalised phone).
 * Creates the customer record if one does not exist.
 * Returns the existing or newly created customer.
 *
 * NOTE: This does NOT check customer status. The caller (booking service)
 * is responsible for enforcing status rules:
 *   - 'irrelevant' → blocked in all contexts
 *   - 'restricted' → blocked in online flow, allowed in manual
 *   - 'active' / 'vacation' → allowed
 *
 * Race condition: if two concurrent requests both find no existing customer
 * and both attempt to insert, the DB UNIQUE(barbershop_id, phone) constraint
 * will reject one. The repository's createCustomer must use
 * INSERT ... ON CONFLICT DO NOTHING RETURNING * with a SELECT fallback.
 * TODO: Implement conflict-safe upsert in createCustomer before public booking
 * flow goes live.
 */
export async function findOrCreateCustomer(
  params: FindOrCreateCustomerParams,
): Promise<Customer> {
  const phone = normalisePhone(params.phone);

  const existing = await findCustomerByPhone(params.barbershopId, phone);
  if (existing) return existing;

  return createCustomer({
    barbershopId: params.barbershopId,
    phone,
    name: params.name,
    email: params.email ?? null,
    status: 'active',
    noShowCount: 0,
    depositRequired: false,
  });
}
