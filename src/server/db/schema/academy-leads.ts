import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import {
  academyLeadStatusEnum,
  previousExperienceEnum,
  preferredStartEnum,
  preferredContactEnum,
} from './types';

export const academyLeads = pgTable('academy_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  // Contact info from intake form
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  // Qualification fields
  previousExperience: previousExperienceEnum('previous_experience'),
  preferredStart: preferredStartEnum('preferred_start'),
  preferredContact: preferredContactEnum('preferred_contact'),
  // Free-text motivation / additional notes from the applicant
  motivation: text('motivation'),
  // Pipeline status
  status: academyLeadStatusEnum('status').notNull().default('new'),
  // Internal notes by owner during qualification / follow-up
  internalNotes: text('internal_notes'),
  // When a consultation was scheduled (if applicable)
  consultationScheduledAt: timestamp('consultation_scheduled_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
