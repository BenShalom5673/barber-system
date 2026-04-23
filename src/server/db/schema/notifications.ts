import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { customers } from './customers';
import { appointments } from './appointments';
import {
  notificationChannelEnum,
  notificationTypeEnum,
  notificationStatusEnum,
} from './types';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, {
    onDelete: 'set null',
  }),
  channel: notificationChannelEnum('channel').notNull(),
  notificationType: notificationTypeEnum('notification_type').notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  // Recipient address: phone number (E.164) or email
  recipient: text('recipient').notNull(),
  // Provider-assigned message ID for delivery tracking
  providerMessageId: text('provider_message_id'),
  // ISO timestamp when the notification was sent or failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  // Error detail if status = failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
