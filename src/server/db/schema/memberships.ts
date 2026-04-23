import { pgTable, timestamp, uuid, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { barbershops } from './barbershops';
import { membershipRoleEnum } from './types';

export const barbershopMemberships = pgTable(
  'barbershop_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    barbershopId: uuid('barbershop_id')
      .notNull()
      .references(() => barbershops.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_membership_user_shop').on(t.userId, t.barbershopId),
    index('idx_barbershop_memberships_user_id').on(t.userId),
  ],
);
