import { pgEnum } from 'drizzle-orm/pg-core';

export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'staff']);

export const serviceTypeEnum = pgEnum('service_type', [
  'direct_booking',
  'consultation_only',
]);

export const depositTypeEnum = pgEnum('deposit_type', [
  'percentage',
  'fixed',
]);

export const overrideTypeEnum = pgEnum('override_type', [
  'day_off',
  'custom_hours',
  'blocked_slot',
]);

export const customerStatusEnum = pgEnum('customer_status', [
  'active',
  'vacation',
  'restricted',
  'irrelevant',
]);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending_deposit',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export const cancelledByEnum = pgEnum('cancelled_by', [
  'client',
  'owner',
  'system',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  'partial',
  'paid',
  'refunded',
]);

export const colorRequestStatusEnum = pgEnum('color_request_status', [
  'new',
  'contacted',
  'waiting_for_photos',
  'qualified',
  'scheduled_manually',
  'cancelled',
]);

export const academyLeadStatusEnum = pgEnum('academy_lead_status', [
  'new',
  'contacted',
  'interested',
  'consultation_scheduled',
  'enrolled',
  'not_proceeding',
]);

export const previousExperienceEnum = pgEnum('previous_experience', [
  'none',
  'some',
  'professional',
]);

export const preferredStartEnum = pgEnum('preferred_start', [
  'asap',
  'one_to_three_months',
  'three_to_six_months',
  'exploring',
]);

export const preferredContactEnum = pgEnum('preferred_contact', [
  'whatsapp',
  'phone',
  'email',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'whatsapp',
  'sms',
  'email',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'booking_confirmation',
  'appointment_reminder',
  'cancellation_confirmation',
  'waitlist_notification',
  'gap_fill',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
]);

// Israeli business entity types
// exempt_dealer: ptur — no VAT charged
// authorized_dealer: esek murshe — charges VAT, issues invoices
// company: chevra — charges VAT, issues invoices, different legal entity
export const businessTypeEnum = pgEnum('business_type', [
  'exempt_dealer',
  'authorized_dealer',
  'company',
]);
