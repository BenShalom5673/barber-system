import { pgTable, text, timestamp, uuid, integer, time, boolean, date, unique } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { staffProfiles } from './staff';
import { overrideTypeEnum, depositTypeEnum } from './types';

// Regular weekly working hours per staff member
// day_of_week: 0 = Sunday, 6 = Saturday
export const staffWorkingHours = pgTable(
  'staff_working_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0–6
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_staff_working_hours_profile_day').on(t.staffProfileId, t.dayOfWeek)],
);

// One-off overrides: days off, custom hours, blocked slots
export const staffScheduleOverrides = pgTable('staff_schedule_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffProfileId: uuid('staff_profile_id')
    .notNull()
    .references(() => staffProfiles.id, { onDelete: 'cascade' }),
  overrideDate: date('override_date').notNull(),
  overrideType: overrideTypeEnum('override_type').notNull(),
  // For custom_hours and blocked_slot: specific times
  startTime: time('start_time'),
  endTime: time('end_time'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Barbershop-level booking and deposit settings
export const barbershopSettings = pgTable('barbershop_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  barbershopId: uuid('barbershop_id')
    .notNull()
    .unique()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  // ─── Booking rules ─────────────────────────────────────────────────────────
  // Minutes before appointment that client cancellation is no longer allowed
  cancellationWindowMinutes: integer('cancellation_window_minutes').notNull().default(180),
  // Buffer added after each appointment (minutes)
  appointmentBufferMinutes: integer('appointment_buffer_minutes').notNull().default(5),
  // How many days ahead clients can book
  bookingHorizonDays: integer('booking_horizon_days').notNull().default(30),
  // Slot interval for booking grid (minutes)
  slotIntervalMinutes: integer('slot_interval_minutes').notNull().default(15),
  isOnlineBookingEnabled: boolean('is_online_booking_enabled').notNull().default(true),
  // ─── Deposit configuration ─────────────────────────────────────────────────
  // Barbershop-wide deposit defaults; individual services may override these.
  // Type and value used when a deposit is required but no service-level override exists.
  defaultDepositType: depositTypeEnum('default_deposit_type'),
  // Percent integer (e.g. 30) if type = 'percentage'; agorot if type = 'fixed'
  defaultDepositValue: integer('default_deposit_value'),
  // How long a pending_deposit appointment holds the slot before auto-cancellation (minutes)
  pendingDepositExpiryMinutes: integer('pending_deposit_expiry_minutes').notNull().default(30),
  // Require deposit for all online bookings regardless of customer history
  depositRequiredForOnlineBookings: boolean('deposit_required_for_online_bookings')
    .notNull()
    .default(false),
  // Auto-flag deposit_required on customer after this many no-shows (null = disabled)
  depositRequiredAfterNoShowCount: integer('deposit_required_after_no_show_count'),
  // Require deposit when booking a restricted customer (manual booking by owner)
  depositRequiredForRestrictedCustomers: boolean('deposit_required_for_restricted_customers')
    .notNull()
    .default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
