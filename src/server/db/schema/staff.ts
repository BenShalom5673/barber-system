import { pgTable, text, timestamp, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { barbershops } from './barbershops';
import { barbershopMemberships } from './memberships';
import { services } from './services';

export const staffProfiles = pgTable('staff_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Direct barbershop FK — required for placeholder profiles created before account linking.
  // barbershopId is the authoritative tenant scope for all queries on this table.
  barbershopId: uuid('barbershop_id')
    .notNull()
    .references(() => barbershops.id, { onDelete: 'cascade' }),
  // Nullable: populated only after the staff member registers and the membership is created.
  // UNIQUE where not null — enforced at application layer on upsert.
  membershipId: uuid('membership_id').references(() => barbershopMemberships.id, {
    onDelete: 'set null',
  }),
  // Holds the invited email before account creation, used to auto-link on registration.
  invitationEmail: text('invitation_email'),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Which services a staff member can perform
export const staffServices = pgTable(
  'staff_services',
  {
    staffProfileId: uuid('staff_profile_id')
      .notNull()
      .references(() => staffProfiles.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.staffProfileId, t.serviceId] })],
);
