import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  customType,
  index,
} from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { customers } from './customers';
import { staffProfiles } from './staff';
import { services } from './services';
import { appointmentStatusEnum, cancelledByEnum, paymentStatusEnum } from './types';

/**
 * Custom Drizzle type for PostgreSQL tstzrange.
 * Used for the GiST exclusion constraint that prevents double-booking.
 *
 * The exclusion constraint itself CANNOT be expressed in Drizzle DSL.
 * It is applied via raw SQL migration:
 *   src/server/db/migrations/0001_exclusion_constraint.sql
 *
 * Constraint logic:
 *   EXCLUDE USING GIST (
 *     staff_profile_id WITH =,
 *     slot_range WITH &&
 *   )
 *   WHERE (status NOT IN ('cancelled', 'no_show'))
 *
 * Requires: btree_gist extension (also created in that migration).
 */
const tstzrange = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tstzrange';
  },
});

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    // Immutable snapshots copied from the service at booking time
    priceAtBookingAgorot: integer('price_at_booking_agorot').notNull(),
    durationAtBookingMinutes: integer('duration_at_booking_minutes').notNull(),
    serviceNameAtBooking: text('service_name_at_booking').notNull(),
    // UTC range: [slot_start, slot_end) where slot_end = start + duration + buffer
    // Targeted by the GiST exclusion constraint for double-booking prevention
    slotRange: tstzrange('slot_range').notNull(),
    status: appointmentStatusEnum('status').notNull().default('confirmed'),
    // payment_status is independent of appointment status
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    // Client-visible notes submitted at booking
    clientNotes: text('client_notes'),
    // Internal notes added by owner/staff
    internalNotes: text('internal_notes'),
    // Populated only when status = 'cancelled'
    cancelledBy: cancelledByEnum('cancelled_by'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    // Populated when appointment was created via online public booking flow
    createdVia: text('created_via').notNull().default('manual'), // 'manual' | 'online'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_appointments_barbershop_id').on(t.barbershopId),
    index('idx_appointments_staff_profile_id').on(t.staffProfileId),
    index('idx_appointments_customer_id').on(t.customerId),
    index('idx_appointments_status').on(t.status),
  ],
);
