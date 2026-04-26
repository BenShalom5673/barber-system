/**
 * Dev seed script — populates the dev database with test data for
 * end-to-end testing of the booking wizard.
 *
 * All rows inserted here carry a sentinel string so they can be removed
 * cleanly without touching real data:
 *   staff_profiles.bio           = '⚠️ dev-seed'
 *   services.description         = '⚠️ dev-seed'
 *   customers.notes              = '⚠️ dev-seed'
 *   appointments.internal_notes  = '⚠️ dev-seed'
 *
 * Usage:
 *   npm run db:seed-dev           — wipe dev-seed rows, then reinsert
 *   npm run db:seed-dev:reset     — wipe dev-seed rows only (no reinsert)
 *
 * Requires DEV_BARBERSHOP_ID and DATABASE_URL in .env.local.
 */

// ─── Future: complex service types ───────────────────────────────────────────
//
// 'צבע לשיער' is currently seeded as a direct_booking service with
// priceIsStarting = true because pricing varies by hair length and product.
//
// In production this service type will transition to 'consultation_only':
//   - The customer submits a color request form
//     (see src/server/db/schema/color-requests.ts for the data model)
//   - The owner reviews, qualifies the lead, and books a manual slot
//   - Final pricing is confirmed at or after the consultation
//
// The booking wizard should NOT offer 'consultation_only' services via the
// standard slot-selection flow. Instead, it will route these services to a
// dedicated "request a consultation" path that creates a color_requests row
// rather than an appointments row.
//
// Until that path is implemented, 'צבע לשיער' stays as direct_booking so the
// full wizard flow can be tested with all four service options visible.
// ─────────────────────────────────────────────────────────────────────────────

import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import {
  services,
  staffProfiles,
  staffServices,
  staffWorkingHours,
  customers,
  appointments,
} from '@/server/db/schema';

// ─── Config ───────────────────────────────────────────────────────────────────

const MARKER = '⚠️ dev-seed';
const RESET_ONLY = process.argv.includes('--reset');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a tstzrange string from two UTC Date objects. */
function slotRange(start: Date, end: Date): string {
  return `[${start.toISOString()},${end.toISOString()})`;
}

/** Return a UTC Date for a given local Israel time (UTC+3) on a given date. */
function ilDate(dateStr: string, localHour: number, localMin: number): Date {
  const utcHour = localHour - 3;
  return new Date(
    `${dateStr}T${String(utcHour).padStart(2, '0')}:${String(localMin).padStart(2, '0')}:00.000Z`,
  );
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function wipe(barbershopId: string): Promise<void> {
  // Respect FK constraints: appointments → customers → staff_profiles → services
  // (staff_services and staff_working_hours cascade from staff_profiles)

  const deletedAppts = await db
    .delete(appointments)
    .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.internalNotes, MARKER)))
    .returning({ id: appointments.id });
  console.log(`  deleted ${deletedAppts.length} appointments`);

  const deletedCustomers = await db
    .delete(customers)
    .where(and(eq(customers.barbershopId, barbershopId), eq(customers.notes, MARKER)))
    .returning({ id: customers.id });
  console.log(`  deleted ${deletedCustomers.length} customers`);

  const deletedStaff = await db
    .delete(staffProfiles)
    .where(and(eq(staffProfiles.barbershopId, barbershopId), eq(staffProfiles.bio, MARKER)))
    .returning({ id: staffProfiles.id });
  console.log(
    `  deleted ${deletedStaff.length} staff profiles (+ cascaded staff_services, working_hours)`,
  );

  const deletedServices = await db
    .delete(services)
    .where(and(eq(services.barbershopId, barbershopId), eq(services.description, MARKER)))
    .returning({ id: services.id });
  console.log(`  deleted ${deletedServices.length} services`);
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed(barbershopId: string): Promise<void> {
  // ── Services ──────────────────────────────────────────────────────────────

  const insertedServices = await db
    .insert(services)
    .values([
      {
        barbershopId,
        name: 'Haircut',
        nameHe: 'תספורת',
        description: MARKER,
        durationMinutes: 20,
        priceAgorot: 8000,
        priceIsStarting: false,
        availableForOnlineBooking: true,
        displayOrder: 1,
      },
      {
        barbershopId,
        name: 'Haircut + Beard',
        nameHe: 'תספורת + זקן',
        description: MARKER,
        durationMinutes: 25,
        priceAgorot: 12000,
        priceIsStarting: false,
        availableForOnlineBooking: true,
        displayOrder: 2,
      },
      {
        barbershopId,
        name: 'Highlights',
        nameHe: 'גוון / הבלטות',
        description: MARKER,
        durationMinutes: 90,
        priceAgorot: 35000,
        priceIsStarting: false,
        availableForOnlineBooking: true,
        displayOrder: 3,
      },
      {
        barbershopId,
        name: 'Hair Colour',
        nameHe: 'צבע לשיער',
        description: MARKER,
        durationMinutes: 120,
        priceAgorot: 55000,
        priceIsStarting: true,
        availableForOnlineBooking: true,
        displayOrder: 4,
      },
    ])
    .returning();

  const svcHaircut    = insertedServices.find((s) => s.nameHe === 'תספורת');
  const svcBeard      = insertedServices.find((s) => s.nameHe === 'תספורת + זקן');
  const svcHighlights = insertedServices.find((s) => s.nameHe === 'גוון / הבלטות');

  if (!svcHaircut || !svcBeard || !svcHighlights) {
    throw new Error('Service insert did not return expected rows');
  }
  console.log(`  inserted ${insertedServices.length} services`);

  // ── Staff profiles ─────────────────────────────────────────────────────────

  const insertedStaff = await db
    .insert(staffProfiles)
    .values([
      { barbershopId, displayName: 'בן',  bio: MARKER, isActive: true },
      { barbershopId, displayName: 'דוד', bio: MARKER, isActive: true },
      { barbershopId, displayName: 'יוסי', bio: MARKER, isActive: true },
    ])
    .returning();

  const ben   = insertedStaff.find((s) => s.displayName === 'בן');
  const david = insertedStaff.find((s) => s.displayName === 'דוד');
  const yossi = insertedStaff.find((s) => s.displayName === 'יוסי');

  if (!ben || !david || !yossi) {
    throw new Error('Staff insert did not return expected rows');
  }
  console.log(`  inserted ${insertedStaff.length} staff profiles`);

  // ── Staff-service assignments ─────────────────────────────────────────────
  // For dev testing: link every active staff member to EVERY active service in
  // the barbershop — both the services just seeded AND any real services that
  // were set up outside the seed script.
  //
  // Why all services, not just seeded ones:
  //   The booking wizard shows all active services. If the user picks a real
  //   service (not a seed one), /api/staff returns [] because staff have rows
  //   for seed UUIDs only — NOT for the real service UUID. Covering all active
  //   services avoids this mismatch entirely.
  //
  // Why not rely on the "no rows → all services" rule:
  //   A staff profile with ANY existing staff_services rows won't be matched
  //   by "NOT EXISTS", so the rule only applies to staff with zero rows total.
  //   After previous seed runs, staff profiles often have partial rows that
  //   silently break eligibility for services not listed in those rows.
  //
  // onConflictDoNothing: idempotent — safe to re-run without a prior wipe.

  const allActiveServices = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.barbershopId, barbershopId), eq(services.isActive, true)));

  const allActiveStaff = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(and(eq(staffProfiles.barbershopId, barbershopId), eq(staffProfiles.isActive, true)));

  const staffServiceRows = allActiveStaff.flatMap((staff) =>
    allActiveServices.map((svc) => ({ staffProfileId: staff.id, serviceId: svc.id })),
  );

  if (staffServiceRows.length > 0) {
    await db.insert(staffServices).values(staffServiceRows).onConflictDoNothing();
  }
  console.log(
    `  inserted staff_services: ${allActiveStaff.length} staff × ${allActiveServices.length} services (${staffServiceRows.length} rows)`,
  );

  // ── Working hours ──────────────────────────────────────────────────────────
  // Sun(0) Mon(1) Tue(2) Wed(3) Thu(4) 09:00–19:00
  // Fri(5) 09:00–14:00. Sat(6) is day off.
  // NOTE: Mon(1) is included so that the test date 2026-04-27 (Monday) has slots.

  const weekdayHours = ([0, 1, 2, 3, 4] as const).flatMap((day) => [
    { staffProfileId: ben.id,   dayOfWeek: day, startTime: '09:00:00', endTime: '19:00:00' },
    { staffProfileId: david.id, dayOfWeek: day, startTime: '09:00:00', endTime: '19:00:00' },
    { staffProfileId: yossi.id, dayOfWeek: day, startTime: '09:00:00', endTime: '19:00:00' },
  ]);
  const fridayHours = [
    { staffProfileId: ben.id,   dayOfWeek: 5, startTime: '09:00:00', endTime: '14:00:00' },
    { staffProfileId: david.id, dayOfWeek: 5, startTime: '09:00:00', endTime: '14:00:00' },
    { staffProfileId: yossi.id, dayOfWeek: 5, startTime: '09:00:00', endTime: '14:00:00' },
  ];

  await db.insert(staffWorkingHours).values([...weekdayHours, ...fridayHours]);
  console.log('  inserted 15 working_hours rows');

  // ── Dev-seed customer ─────────────────────────────────────────────────────

  const insertedCustomers = await db
    .insert(customers)
    .values({ barbershopId, firstName: 'לקוח', lastName: 'פיתוח', phone: '0500000000', notes: MARKER })
    .returning();

  const customer = insertedCustomers[0];
  if (!customer) throw new Error('Failed to insert dev customer');
  console.log('  inserted 1 customer');

  // ── Appointments ───────────────────────────────────────────────────────────
  // Test date: next Sunday (2026-04-27). Israel is UTC+3 in April (IDDST).
  // Slot format: [ISO_UTC, ISO_UTC) — duration includes 5-min buffer.
  //
  // בן   12:00 IL תספורת (20 min)        → [09:00, 09:25) UTC
  // בן   12:30 IL תספורת + זקן (25 min)  → [09:30, 10:00) UTC
  // דוד  13:00 IL תספורת + זקן (25 min)  → [10:00, 10:30) UTC
  // דוד  15:00 IL תספורת (20 min)        → [12:00, 12:25) UTC
  // יוסי 12:00 IL תספורת (20 min)        → [09:00, 09:25) UTC

  const DATE = '2026-04-27';
  const DATE2 = '2026-04-28'; // Tuesday — gap-propagation test date
  const BUFFER_MINUTES = 5;

  function slot(localHour: number, localMin: number, durationMin: number): string {
    const start = ilDate(DATE, localHour, localMin);
    const end   = new Date(start.getTime() + (durationMin + BUFFER_MINUTES) * 60_000);
    return slotRange(start, end);
  }

  function slot2(localHour: number, localMin: number, durationMin: number): string {
    const start = ilDate(DATE2, localHour, localMin);
    const end   = new Date(start.getTime() + (durationMin + BUFFER_MINUTES) * 60_000);
    return slotRange(start, end);
  }

  await db.insert(appointments).values([
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           ben.id,
      serviceId:                svcHaircut.id,
      priceAtBookingAgorot:     svcHaircut.priceAgorot,
      durationAtBookingMinutes: svcHaircut.durationMinutes,
      serviceNameAtBooking:     svcHaircut.nameHe ?? svcHaircut.name,
      slotRange:                slot(12, 0, svcHaircut.durationMinutes),
      internalNotes:            MARKER,
    },
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           ben.id,
      serviceId:                svcBeard.id,
      priceAtBookingAgorot:     svcBeard.priceAgorot,
      durationAtBookingMinutes: svcBeard.durationMinutes,
      serviceNameAtBooking:     svcBeard.nameHe ?? svcBeard.name,
      slotRange:                slot(12, 30, svcBeard.durationMinutes),
      internalNotes:            MARKER,
    },
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           david.id,
      serviceId:                svcBeard.id,
      priceAtBookingAgorot:     svcBeard.priceAgorot,
      durationAtBookingMinutes: svcBeard.durationMinutes,
      serviceNameAtBooking:     svcBeard.nameHe ?? svcBeard.name,
      slotRange:                slot(13, 0, svcBeard.durationMinutes),
      internalNotes:            MARKER,
    },
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           david.id,
      serviceId:                svcHaircut.id,
      priceAtBookingAgorot:     svcHaircut.priceAgorot,
      durationAtBookingMinutes: svcHaircut.durationMinutes,
      serviceNameAtBooking:     svcHaircut.nameHe ?? svcHaircut.name,
      slotRange:                slot(15, 0, svcHaircut.durationMinutes),
      internalNotes:            MARKER,
    },
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           yossi.id,
      serviceId:                svcHaircut.id,
      priceAtBookingAgorot:     svcHaircut.priceAgorot,
      durationAtBookingMinutes: svcHaircut.durationMinutes,
      serviceNameAtBooking:     svcHaircut.nameHe ?? svcHaircut.name,
      slotRange:                slot(12, 0, svcHaircut.durationMinutes),
      internalNotes:            MARKER,
    },
    // ── Gap-start test cases for דוד on 2026-04-27 ──────────────────────────
    // Blocked [11:00, 11:25) → blocked [11:55, 12:25)
    // Gap = 11:25–11:55 (30 min).  תספורת+זקן (25 min + 5 buffer = 30 min) exactly fits.
    // 11:25 is NOT on the 15-min grid but MUST be offered via gap-start injection.
    // 11:30 falls on the 15-min grid but overlaps [11:55, 12:25) → must be blocked.
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           david.id,
      serviceId:                svcHaircut.id,
      priceAtBookingAgorot:     svcHaircut.priceAgorot,
      durationAtBookingMinutes: svcHaircut.durationMinutes,
      serviceNameAtBooking:     svcHaircut.nameHe ?? svcHaircut.name,
      slotRange:                slot(11, 0, svcHaircut.durationMinutes),  // blocks [11:00, 11:25)
      internalNotes:            MARKER,
    },
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           david.id,
      serviceId:                svcBeard.id,
      priceAtBookingAgorot:     svcBeard.priceAgorot,
      durationAtBookingMinutes: svcBeard.durationMinutes,
      serviceNameAtBooking:     svcBeard.nameHe ?? svcBeard.name,
      slotRange:                slot(11, 55, svcBeard.durationMinutes), // blocks [11:55, 12:25)
      internalNotes:            MARKER,
    },
    // ── Gap-propagation test for דוד on 2026-04-28 (Tuesday) ────────────────
    // One blocked range ending at 12:25 IL. With gap-based propagation stepping
    // by service duration (25 min), expected slots from 12:25: 12:25, 12:50, 13:15, …
    {
      barbershopId,
      customerId:               customer.id,
      staffProfileId:           david.id,
      serviceId:                svcBeard.id,
      priceAtBookingAgorot:     svcBeard.priceAgorot,
      durationAtBookingMinutes: svcBeard.durationMinutes,
      serviceNameAtBooking:     svcBeard.nameHe ?? svcBeard.name,
      slotRange:                slot2(11, 55, svcBeard.durationMinutes), // blocks [11:55, 12:25) IL
      internalNotes:            MARKER,
    },
  ]);
  console.log('  inserted 8 appointments');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const barbershopId = process.env.DEV_BARBERSHOP_ID;
  if (!barbershopId) {
    console.error('Error: DEV_BARBERSHOP_ID is not set in .env.local');
    process.exit(1);
  }

  console.log(`\nDev seed — barbershop ${barbershopId}`);

  console.log('\n[1/2] Wiping existing dev-seed rows...');
  await wipe(barbershopId);

  if (RESET_ONLY) {
    console.log('\nDone (reset only — no data inserted).\n');
    process.exit(0);
  }

  console.log('\n[2/2] Inserting dev-seed rows...');
  await seed(barbershopId);

  console.log('\nDone.\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
