type PaymentMode = 'pay_at_shop' | 'pay_online_full' | 'pay_online_deposit';

interface ConfirmData {
  selectedService?: {
    name: string;
    priceAgorot: number;
    priceIsStarting?: boolean;
  };
  bookingMode?: 'earliest' | 'specific';
  staffProfileId?: string | null;
  staffName?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: PaymentMode;
  depositAgorot?: number;
}

interface Props {
  data: ConfirmData;
  onBack: () => void;
}

function shekelStr(agorot: number): string {
  const shekels = agorot / 100;
  return `₪ ${shekels % 1 === 0 ? shekels.toFixed(0) : shekels.toFixed(2)}`;
}

function priceStr(agorot: number, isStarting?: boolean): string {
  return isStarting ? `החל מ-${shekelStr(agorot)}` : shekelStr(agorot);
}

export default function ConfirmStep({ data, onBack }: Props) {
  const service = data.selectedService;
  const mode = data.paymentMode ?? 'pay_at_shop';

  const staffDisplay =
    data.bookingMode === 'earliest'
      ? 'ייקבע לפי התור שתבחר'
      : (data.staffName ?? '—');

  const staffOk =
    data.bookingMode === 'earliest' ||
    (data.bookingMode === 'specific' && !!data.staffProfileId);

  const canConfirm =
    !!service &&
    staffOk &&
    !!data.customerName?.trim() &&
    !!data.customerPhone?.trim();

  // ─── Summary rows (all 6 always shown) ────────────────────────────────────

  const summaryRows = [
    { label: 'שירות',    value: service?.name ?? '—' },
    { label: 'ספר',      value: staffDisplay },
    { label: 'תאריך',   value: data.date ?? '—' },
    { label: 'שעה',      value: data.time ?? '—' },
    { label: 'שם לקוח', value: data.customerName ?? '—' },
    { label: 'טלפון',    value: data.customerPhone ?? '—' },
  ];

  // ─── Price rows ────────────────────────────────────────────────────────────

  const priceRows: { label: string; value: string; bold: boolean }[] = [];

  if (service) {
    const full = priceStr(service.priceAgorot, service.priceIsStarting);
    if (mode === 'pay_at_shop') {
      priceRows.push({ label: 'לתשלום במספרה', value: full, bold: true });
    } else if (mode === 'pay_online_full') {
      priceRows.push({ label: 'לתשלום עכשיו', value: full, bold: true });
    } else if (mode === 'pay_online_deposit' && data.depositAgorot !== undefined) {
      const remaining = service.priceAgorot - data.depositAgorot;
      priceRows.push({ label: 'מקדמה לתשלום עכשיו', value: shekelStr(data.depositAgorot), bold: true });
      priceRows.push({ label: 'יתרה במספרה',          value: shekelStr(remaining),           bold: false });
    }
  }

  // ─── Confirm button ───────────────────────────────────────────────────────

  let confirmLabel = 'אשר הזמנה';
  if (service) {
    if (mode === 'pay_online_full') {
      confirmLabel = `המשך לתשלום ${shekelStr(service.priceAgorot)}`;
    } else if (mode === 'pay_online_deposit' && data.depositAgorot !== undefined) {
      confirmLabel = `שלם מקדמה ${shekelStr(data.depositAgorot)}`;
    }
  }

  return (
    <div className="flex flex-col">

      {/* Content */}
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">אישור הזמנה</h2>
            <p className="text-sm text-muted">בדוק את הפרטים לפני האישור</p>
          </div>

          {/* Booking summary */}
          <div className="rounded-card border border-border bg-surface mb-4 overflow-hidden">
            {summaryRows.map(({ label, value }, i) => (
              <div
                key={label}
                className={[
                  'flex justify-between items-center px-5 py-3.5',
                  i < summaryRows.length - 1 ? 'border-b border-border' : '',
                ].join(' ')}
              >
                <span className="text-xs text-muted">{label}</span>
                <span className="text-sm text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          {priceRows.length > 0 && (
            <div className="rounded-card border border-border bg-card overflow-hidden">
              {priceRows.map(({ label, value, bold }, i) => (
                <div
                  key={label}
                  className={[
                    'flex justify-between items-center px-5 py-4',
                    i < priceRows.length - 1 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <span className={`text-sm ${bold ? 'font-semibold text-foreground' : 'text-muted'}`}>
                    {label}
                  </span>
                  <span className={bold ? 'text-base font-bold text-accent' : 'text-sm text-foreground font-medium'}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 sm:px-10 py-5 flex justify-center">
        <div className="w-full max-w-[480px] flex justify-between items-center">
          <button
            type="button"
            disabled={!canConfirm}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-button transition-colors"
          >
            {confirmLabel}
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
