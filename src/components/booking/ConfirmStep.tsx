import { type ServiceOption } from '@/components/booking/ServiceStep';

interface ConfirmData {
  selectedService?: ServiceOption;
  staffName?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
}

interface Props {
  data: ConfirmData;
  onBack: () => void;
}

function formatPrice(agorot: number, isStarting?: boolean): string {
  const shekels = agorot / 100;
  const amount = shekels % 1 === 0 ? shekels.toFixed(0) : shekels.toFixed(2);
  return isStarting ? `החל מ-₪ ${amount}` : `₪ ${amount}`;
}

export default function ConfirmStep({ data, onBack }: Props) {
  const service = data.selectedService;
  const price = service ? formatPrice(service.priceAgorot, service.priceIsStarting) : null;
  const totalLabel = service?.priceIsStarting ? 'סה״כ משוער' : 'סה״כ';

  const dateTime = data.date && data.time ? `${data.date} ${data.time}` : null;

  const rows: { label: string; value: string }[] = [
    { label: 'שירות',       value: service?.name ?? '—' },
    { label: 'משך',         value: service ? `${service.durationMinutes} דקות` : '—' },
    { label: 'מחיר',        value: price ?? '—' },
    { label: 'ספר',         value: data.staffName ?? '—' },
    { label: 'תאריך ושעה', value: dateTime ?? '—' },
    { label: 'שם',          value: data.customerName ?? '—' },
    { label: 'טלפון',       value: data.customerPhone ?? '—' },
  ];

  return (
    <div className="flex flex-col">

      {/* Content */}
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">אישור הזמנה</h2>
            <p className="text-sm text-muted">בדוק את הפרטים לפני האישור</p>
          </div>

          {/* Summary rows */}
          <div className="rounded-card border border-border bg-surface mb-4 overflow-hidden">
            {rows.map(({ label, value }, i) => (
              <div
                key={label}
                className={[
                  'flex justify-between items-center px-5 py-3.5',
                  i < rows.length - 1 ? 'border-b border-border' : '',
                ].join(' ')}
              >
                <span className="text-xs text-muted">{label}</span>
                <span className="text-sm text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          {price && (
            <div className="rounded-card border border-border bg-card px-5 py-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">{totalLabel}</span>
              <span className="text-base font-bold text-accent">{price}</span>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 sm:px-10 py-5 flex justify-center">
        <div className="w-full max-w-[480px] flex justify-between items-center">
          <button
            type="button"
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-button transition-colors"
          >
            אשר הזמנה
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            חזור
          </button>
        </div>
      </div>

    </div>
  );
}
