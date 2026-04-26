import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { customers } from './customers';

export const customerSessions = pgTable('customer_sessions', {
  id: text('id').primaryKey(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  // Nullable until the customer completes their profile (Phase 2).
  // Null means: phone verified, customer row not yet created.
  customerId: uuid('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' }),
  // Always set — the verified E.164 phone.
  // Used to link the session to a customer row after profile completion.
  phone: text('phone').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
