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
  staffProfileId?: string | null;
  staffName?: string;
  slotStart?: string;
  customerName?: string;
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
    setData((d) => ({ ...d, serviceId }));
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

  const content = [
    <ServiceStep  key="service"  services={services} onNext={handleServiceNext} />,
    <StaffStep    key="staff"    serviceId={data.serviceId ?? ''} onNext={handleStaffNext} onBack={back} />,
    <DateTimeStep key="datetime" barbershopId={barbershopId} serviceId={data.serviceId ?? ''} staffProfileId={data.staffProfileId ?? null} onNext={handleDateTimeNext} onBack={back} />,
    <CustomerStep key="details"  data={data} onChange={handleCustomerChange} onNext={next} onBack={back} />,
    <ConfirmStep  key="confirm"  data={{}} onBack={back} />,
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
