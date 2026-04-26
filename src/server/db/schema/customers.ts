import { pgTable, text, timestamp, uuid, integer, boolean, unique, date } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { customerStatusEnum } from './types';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    // Phone stored in E.164 format, unique per barbershop
    phone: text('phone').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    birthDate: date('birth_date'),
    notes: text('notes'),
    status: customerStatusEnum('status').notNull().default('active'),
    // Set automatically when no_show_count reaches the policy threshold,
    // or manually by the owner. Triggers deposit requirement on next booking.
    depositRequired: boolean('deposit_required').notNull().default(false),
    // Counts for no-show policy enforcement
    noShowCount: integer('no_show_count').notNull().default(0),
    lastNoShowAt: timestamp('last_no_show_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_customer_shop_phone').on(t.barbershopId, t.phone)],
);
