import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';

export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
