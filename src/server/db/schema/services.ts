import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { serviceTypeEnum, depositTypeEnum } from './types';

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nameHe: text('name_he'),
  description: text('description'),
  descriptionHe: text('description_he'),
  // Duration in minutes (not including buffer)
  durationMinutes: integer('duration_minutes').notNull(),
  // Price in agorot (ILS × 100)
  priceAgorot: integer('price_agorot').notNull(),
  // When true, price is displayed as "starting from" (e.g. colour services with variable pricing)
  priceIsStarting: boolean('price_is_starting').notNull().default(false),
  vatApplicable: boolean('vat_applicable').notNull().default(true),
  serviceType: serviceTypeEnum('service_type').notNull().default('direct_booking'),
  isActive: boolean('is_active').notNull().default(true),
  availableForOnlineBooking: boolean('available_for_online_booking').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  // Deposit configuration — null means inherit barbershop default
  // depositRequired = false means no deposit regardless of barbershop defaults
  depositRequired: boolean('deposit_required').notNull().default(false),
  depositType: depositTypeEnum('deposit_type'),
  // Interpreted as percent integer (e.g. 30) if depositType = 'percentage',
  // or as agorot if depositType = 'fixed'. Null when depositRequired = false or type not set.
  depositValue: integer('deposit_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
