import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const barbershops = pgTable('barbershops', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  timezone: text('timezone').notNull().default('Asia/Jerusalem'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
