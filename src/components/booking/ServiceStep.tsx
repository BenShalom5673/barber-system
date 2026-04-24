'use client';

import { useState } from 'react';

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceAgorot: number;
  priceIsStarting?: boolean;
}

interface Props {
  services: ServiceOption[];
  onNext: (serviceId: string) => void;
}

function formatPrice(agorot: number, isStarting?: boolean): string {
  const shekels = agorot / 100;
  const amount = shekels % 1 === 0 ? shekels.toFixed(0) : shekels.toFixed(2);
  return isStarting ? `החל מ-₪ ${amount}` : `₪ ${amount}`;
}

export default function ServiceStep({ services, onNext }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">

      {/* Content */}
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">בחר שירות</h2>
            <p className="text-sm text-muted">איזה שירות תרצה לקבוע?</p>
          </div>

          <div className="flex flex-col gap-3">
            {services.length === 0 && (
              <p className="text-sm text-muted text-center py-10">אין שירותים זמינים</p>
            )}

            {services.map((service) => {
              const isSelected = service.id === selectedId;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedId(service.id)}
                  className={[
                    'w-full text-start bg-card rounded-card border px-5 py-4',
                    'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover',
                    isSelected ? 'border-accent shadow-card' : 'border-border shadow-card',
                  ].join(' ')}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.name}</p>
                      <p className="text-xs text-muted mt-0.5">{service.durationMinutes} דקות</p>
                    </div>
                    <p className="text-sm font-medium text-foreground shrink-0">
                      {formatPrice(service.priceAgorot, service.priceIsStarting)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 sm:px-10 py-5 flex justify-center">
        <div className="w-full max-w-[480px]">
          <button
            type="button"
            onClick={() => selectedId && onNext(selectedId)}
            disabled={!selectedId}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-button transition-colors"
          >
            המשך
          </button>
        </div>
      </div>

    </div>
  );
}
