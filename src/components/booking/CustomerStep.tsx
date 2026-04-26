export interface CustomerStepData {
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerBirthDate?: string;
  marketingConsent?: boolean;
}

interface Props {
  data: CustomerStepData;
  onChange: (patch: Partial<CustomerStepData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const inputClass = [
  'w-full h-10 px-3 rounded-button border border-border bg-card',
  'text-sm text-foreground placeholder:text-muted',
  'focus:outline-none focus:border-accent transition-colors',
].join(' ');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIsraeliPhone(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return (
    (digits.startsWith('0') && digits.length === 10) ||
    (digits.startsWith('5') && digits.length === 9) ||
    (digits.startsWith('972') && digits.length === 12)
  );
}

export default function CustomerStep({ data, onChange, onNext, onBack }: Props) {
  const hasPromoData = !!(data.customerEmail?.trim() || data.customerBirthDate);
  const consentOk = !hasPromoData || !!data.marketingConsent;
  const firstNameOk = (data.customerFirstName?.trim().length ?? 0) >= 2;
  const lastNameOk  = (data.customerLastName?.trim().length ?? 0) >= 2;
  const phoneOk     = isValidIsraeliPhone(data.customerPhone ?? '');
  const emailOk     = !data.customerEmail?.trim() || EMAIL_REGEX.test(data.customerEmail.trim());
  const birthDateOk = !data.customerBirthDate || new Date(data.customerBirthDate) <= new Date();
  const canContinue = firstNameOk && lastNameOk && phoneOk && emailOk && birthDateOk && consentOk;

  return (
    <div className="flex flex-col">

      {/* Content */}
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">פרטי לקוח</h2>
            <p className="text-sm text-muted">נצטרך כמה פרטים לאישור ההזמנה</p>
          </div>

          {/* Required fields */}
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">שם פרטי</label>
              <input
                type="text"
                value={data.customerFirstName ?? ''}
                onChange={(e) => onChange({ customerFirstName: e.target.value })}
                className={inputClass}
                placeholder="ישראל"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">שם משפחה</label>
              <input
                type="text"
                value={data.customerLastName ?? ''}
                onChange={(e) => onChange({ customerLastName: e.target.value })}
                className={inputClass}
                placeholder="ישראלי"
                autoComplete="family-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">מספר טלפון</label>
              <input
                type="tel"
                inputMode="numeric"
                value={data.customerPhone ?? ''}
                onChange={(e) => onChange({ customerPhone: e.target.value })}
                className={inputClass}
                placeholder="050-0000000"
                dir="ltr"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Promo section */}
          <div className="rounded-card border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">הנחות ומבצעים</h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              אם תמלא/י אימייל ותאריך לידה, נוכל לשלוח לך הטבות, מבצעים והנחות לימי הולדת.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">אימייל</label>
                <input
                  type="email"
                  value={data.customerEmail ?? ''}
                  onChange={(e) => onChange({ customerEmail: e.target.value })}
                  className={inputClass}
                  placeholder="example@email.com"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">תאריך לידה</label>
                <input
                  type="date"
                  value={data.customerBirthDate ?? ''}
                  onChange={(e) => onChange({ customerBirthDate: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            {hasPromoData && (
              <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.marketingConsent}
                  onChange={(e) => onChange({ marketingConsent: e.target.checked })}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-accent"
                />
                <span className="text-xs text-muted leading-relaxed">
                  אני מאשר/ת קבלת הודעות ועדכונים במייל, WhatsApp ו-SMS.
                </span>
              </label>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 sm:px-10 py-5 flex justify-center">
        <div className="w-full max-w-[480px] flex justify-between items-center">
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-button transition-colors"
          >
            המשך
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
