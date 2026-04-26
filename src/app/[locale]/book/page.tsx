'use client';

import { useState, useEffect } from 'react';
import ServiceStep, { type ServiceOption } from '@/components/booking/ServiceStep';
import StaffStep from '@/components/booking/StaffStep';
import DateTimeStep from '@/components/booking/DateTimeStep';
import CustomerStep from '@/components/booking/CustomerStep';
import ConfirmStep from '@/components/booking/ConfirmStep';

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface BookingData {
  serviceId?: string;
  selectedService?: { name: string; priceAgorot: number; priceIsStarting?: boolean };
  staffProfileId?: string | null;
  staffName?: string;
  slotStart?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerBirthDate?: string;
  marketingConsent?: boolean;
}

interface ServiceApiRow {
  id: string;
  barbershopId: string;
  name: string;
  nameHe: string | null;
  durationMinutes: number;
  priceAgorot: number;
  priceIsStarting: boolean;
  availableForOnlineBooking: boolean;
}

const STEPS = [
  { key: 'service',  label: 'שירות' },
  { key: 'staff',    label: 'ספר' },
  { key: 'datetime', label: 'תאריך' },
  { key: 'details',  label: 'פרטים' },
  { key: 'confirm',  label: 'אישור' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingData>({});
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [barbershopId, setBarbershopId] = useState('');
  const [booked, setBooked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((rows: ServiceApiRow[]) => {
        const first = rows[0];
        if (first) setBarbershopId(first.barbershopId);
        setServices(
          rows
            .filter((s) => s.availableForOnlineBooking)
            .map((s) => ({
              id: s.id,
              name: s.nameHe ?? s.name,
              durationMinutes: s.durationMinutes,
              priceAgorot: s.priceAgorot,
              priceIsStarting: s.priceIsStarting,
            })),
        );
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleServiceNext = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setData((d) => ({
      ...d,
      serviceId,
      ...(service && {
        selectedService: {
          name: service.name,
          priceAgorot: service.priceAgorot,
          ...(service.priceIsStarting !== undefined && { priceIsStarting: service.priceIsStarting }),
        },
      }),
    }));
    next();
  };

  const handleStaffNext = (staffProfileId: string, staffName: string) => {
    setData((d) => ({ ...d, staffProfileId, staffName }));
    next();
  };

  const handleDateTimeNext = (slotStart: string) => {
    setData((d) => ({ ...d, slotStart }));
    next();
  };

  const handleCustomerChange = (patch: Partial<BookingData>) =>
    setData((d) => ({ ...d, ...patch }));

  const handleConfirm = async () => {
    if (!data.serviceId || !data.staffProfileId || !data.slotStart || !data.customerFirstName || !data.customerLastName || !data.customerPhone) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: data.serviceId,
          staffProfileId: data.staffProfileId,
          start: data.slotStart,
          customerFirstName: data.customerFirstName,
          customerLastName: data.customerLastName,
          customerPhone: data.customerPhone,
          ...(data.customerEmail && { customerEmail: data.customerEmail }),
          ...(data.customerBirthDate && { customerBirthDate: data.customerBirthDate }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setBookingError(body.error ?? 'שגיאה בשמירת ההזמנה');
        return;
      }
      setBooked(true);
    } catch {
      setBookingError('שגיאה בשמירת ההזמנה');
    } finally {
      setSubmitting(false);
    }
  };

  const content = [
    <ServiceStep  key="service"  services={services} onNext={handleServiceNext} />,
    <StaffStep    key="staff"    serviceId={data.serviceId ?? ''} onNext={handleStaffNext} onBack={back} />,
    <DateTimeStep key="datetime" barbershopId={barbershopId} serviceId={data.serviceId ?? ''} staffProfileId={data.staffProfileId ?? null} onNext={handleDateTimeNext} onBack={back} />,
    <CustomerStep key="details"  data={data} onChange={handleCustomerChange} onNext={next} onBack={back} />,
    <ConfirmStep
      key="confirm"
      data={{
        bookingMode: 'specific',
        ...(data.selectedService && { selectedService: data.selectedService }),
        ...(data.staffProfileId !== undefined && { staffProfileId: data.staffProfileId }),
        ...(data.staffName && { staffName: data.staffName }),
        ...(data.slotStart && {
          date: data.slotStart.slice(0, 10),
          time: (data.slotStart.split('T')[1] ?? '').slice(0, 5),
        }),
        ...((data.customerFirstName || data.customerLastName) && {
          customerName: [data.customerFirstName, data.customerLastName].filter(Boolean).join(' '),
        }),
        ...(data.customerPhone && { customerPhone: data.customerPhone }),
      }}
      onConfirm={handleConfirm}
      isSubmitting={submitting}
      bookingError={bookingError}
      onBack={back}
    />,
  ];

  const serviceStepLoading = (
    <div className="flex flex-col">
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">
          <div className="mb-8">
            <div className="h-5 w-20 rounded bg-border/60 animate-pulse mb-2" />
            <div className="h-4 w-36 rounded bg-border/60 animate-pulse" />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-card border border-border bg-border/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border px-6 sm:px-10 py-5">
        <div className="w-full max-w-[480px] mx-auto">
          <div className="h-11 rounded-button bg-border/60 animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (booked) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[480px] bg-card rounded-card shadow-card p-10 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-3">ההזמנה אושרה!</h2>
          <p className="text-sm text-muted mb-6">נשמח לראות אותך. נתראה בקרוב!</p>
          <button
            type="button"
            onClick={() => { setBooked(false); setStep(0); setData({}); }}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-button transition-colors"
          >
            קביעת תור נוסף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center px-4 py-10">

      {/* ── Progress indicator ─────────────────────────────────────────────── */}
      <div className="w-full max-w-[720px] mb-10 px-2">
        <div className="relative flex justify-between items-start">

          <div className="absolute top-4 start-0 end-0 h-px bg-border" />

          {STEPS.map(({ key, label }, i) => (
            <div key={key} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  i === step
                    ? 'bg-accent text-white'
                    : i < step
                    ? 'bg-accent-light text-accent border border-accent'
                    : 'bg-card border border-border text-muted',
                ].join(' ')}
              >
                {i + 1}
              </div>
              <span
                className={[
                  'text-xs hidden sm:block',
                  i === step ? 'text-foreground font-medium' : 'text-muted',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step card ──────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[720px] bg-card rounded-card shadow-card overflow-hidden">
        {loadingServices && step === 0 ? serviceStepLoading : content[step]}
      </div>

    </div>
  );
}
