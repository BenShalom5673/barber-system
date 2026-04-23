import { pgTable, text, timestamp, uuid, boolean, unique } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { notificationChannelEnum } from './types';

// Notification channel configuration per barbershop
export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    // Channel-specific sender config (phone number or email address)
    senderAddress: text('sender_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_notification_settings_shop_channel').on(t.barbershopId, t.channel)],
);
