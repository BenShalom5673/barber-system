import { pgTable, timestamp, uuid, integer, unique } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';

/**
 * Configurable per-offense no-show charge policy for a barbershop.
 * Each row defines what percentage of the service price is charged
 * for a specific offense number (1st, 2nd, 3rd+ no-show).
 *
 * offense_number: 1-based. offense_number = 1 is the first no-show.
 *   A catch-all for all offenses beyond the last defined row is handled
 *   at the application layer by selecting the row with the highest
 *   offense_number <= actual count.
 *
 * charge_percent: integer 0–100. 0 = no charge (warning only).
 *   100 = full service price charged.
 *
 * Example setup:
 *   (barbershopId, 1, 0)   — first no-show: warning, no charge
 *   (barbershopId, 2, 50)  — second no-show: 50% charge
 *   (barbershopId, 3, 100) — third+ no-show: full charge
 */
export const noShowPolicies = pgTable(
  'no_show_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    // 1-based offense count this rule applies to
    offenseNumber: integer('offense_number').notNull(),
    // Percentage of service price to charge (0–100)
    chargePercent: integer('charge_percent').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_no_show_policy_shop_offense').on(t.barbershopId, t.offenseNumber),
  ],
);
