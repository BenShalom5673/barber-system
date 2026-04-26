'use client';

import { useState, useEffect } from 'react';

interface SlotEntry {
  start: string;
  end: string;
}

type SlotsResponse =
  | { mode: 'specific_staff' | 'single_staff'; slots: SlotEntry[] }
  | { mode: 'multi_staff' };

interface Props {
  barbershopId: string;
  serviceId: string;
  staffProfileId?: string | null;
  onNext: (slotStart: string) => void;
  onBack: () => void;
}

function localTime(iso: string): string {
  return iso.split('T')[1]?.slice(0, 5) ?? '';
}

export default function DateTimeStep({ barbershopId, serviceId, staffProfileId, onNext, onBack }: Props) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !serviceId || !barbershopId) {
      return;
    }

    setLoading(true);
    setSlots([]);
    setSelected(null);
    setError(null);

    const params = new URLSearchParams({ barbershopId, serviceId, date });
    if (staffProfileId) params.set('staffProfileId', staffProfileId);

    const url = `/api/availability?${params}`;

    fetch(url)
      .then((r) => r.json())
      .then((res: SlotsResponse) => {
        if (res.mode === 'multi_staff') {
          setError('לא נבחר ספר — אנא חזור ובחר ספר');
          return;
        }
        setSlots(res.slots.filter((s) => new Date(s.start).getTime() >= Date.now()));
      })
      .catch(() => {
        setError('שגיאה בטעינת שעות זמינות');
      })
      .finally(() => setLoading(false));
  }, [date, serviceId, staffProfileId, barbershopId]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col">

      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">בחר תאריך ושעה</h2>
            <p className="text-sm text-muted">מתי תרצה להגיע?</p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-foreground mb-1.5">תאריך</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-button border border-border bg-card text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              dir="ltr"
            />
          </div>

          <div className="min-h-[100px]">
            {loading && (
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-16 h-10 rounded-button border border-border bg-border/40 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-muted text-center py-4">{error}</p>
            )}

            {!loading && !error && date && slots.length === 0 && (
              <p className="text-sm text-muted text-center py-4">אין שעות פנויות בתאריך זה</p>
            )}

            {!loading && !error && slots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelected(slot.start === selected ? null : slot.start)}
                    className={[
                      'px-4 py-2 rounded-button text-sm font-medium border transition-colors',
                      slot.start === selected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-card text-foreground border-border hover:border-accent',
                    ].join(' ')}
                  >
                    {localTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="border-t border-border px-6 sm:px-10 py-5">
        <div className="w-full max-w-[480px] mx-auto flex justify-between items-center">
          <button
            type="button"
            onClick={() => { if (selected) onNext(selected); }}
            disabled={!selected}
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
