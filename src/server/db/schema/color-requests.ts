import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { customers } from './customers';
import { colorRequestStatusEnum } from './types';

export const colorRequests = pgTable('color_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  // Nullable: request can arrive before the customer record exists
  customerId: uuid('customer_id').references(() => customers.id, {
    onDelete: 'set null',
  }),
  // Raw contact info captured from form submission
  submittedName: text('submitted_name').notNull(),
  submittedPhone: text('submitted_phone').notNull(),
  // Hair history and desired result
  currentHairDescription: text('current_hair_description'),
  desiredResult: text('desired_result'),
  // R2 URLs for reference photos submitted by client
  photoUrls: text('photo_urls').array(),
  status: colorRequestStatusEnum('status').notNull().default('new'),
  // Internal notes by owner/staff during qualification
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
