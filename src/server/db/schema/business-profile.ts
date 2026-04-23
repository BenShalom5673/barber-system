import { pgTable, text, timestamp, uuid, integer, unique } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { businessTypeEnum } from './types';

/**
 * Stores the legal and financial identity of a barbershop.
 * One row per barbershop (enforced by unique constraint on barbershop_id).
 *
 * vatRate: stored as an integer basis points value (e.g. 1700 = 17%).
 *          Use vatRate / 10000 to get the multiplier.
 *          exempt_dealer businesses should set vatRate = 0.
 *
 * registrationNumber: Israeli business registration number (mispar osek / ח.פ.).
 * vatNumber: may differ from registrationNumber for some entity types.
 * accountantEmail: optional; used to CC accountant on financial documents.
 * timezone: IANA timezone string (e.g. 'Asia/Jerusalem').
 */
export const businessProfiles = pgTable(
  'business_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .unique()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address').notNull(),
    phone: text('phone').notNull(),
    registrationNumber: text('registration_number'),
    vatNumber: text('vat_number'),
    businessType: businessTypeEnum('business_type').notNull().default('authorized_dealer'),
    // Basis points: 1700 = 17%, 0 = exempt. Stored as integer to avoid float precision issues.
    vatRate: integer('vat_rate').notNull().default(1800),
    timezone: text('timezone').notNull().default('Asia/Jerusalem'),
    accountantEmail: text('accountant_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);
