'use client';

import { useState, useEffect } from 'react';

interface StaffOption {
  id: string;
  displayName: string;
  bio: string | null;
}

interface Props {
  serviceId: string;
  onNext: (staffProfileId: string, staffName: string) => void;
  onBack: () => void;
}

export default function StaffStep({ serviceId, onNext, onBack }: Props) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    setSelectedId(null);
    fetch(`/api/staff?serviceId=${encodeURIComponent(serviceId)}`)
      .then((r) => r.json())
      .then((rows: StaffOption[]) => setStaff(rows))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const selected = staff.find((s) => s.id === selectedId);

  return (
    <div className="flex flex-col">

      {/* Content */}
      <div className="p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-[480px]">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">בחר ספר</h2>
            <p className="text-sm text-muted">עם מי תרצה לקבוע?</p>
          </div>

          <div className="flex flex-col gap-3">
            {loading && [0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-card border border-border bg-border/40 animate-pulse" />
            ))}

            {!loading && staff.length === 0 && (
              <p className="text-sm text-muted text-center py-10">אין ספרים זמינים לשירות זה</p>
            )}

            {!loading && staff.map((member) => {
              const isSelected = member.id === selectedId;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  className={[
                    'w-full text-start bg-card rounded-card border px-5 py-4',
                    'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover',
                    isSelected ? 'border-accent shadow-card' : 'border-border shadow-card',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-foreground">{member.displayName}</p>
                  {member.bio && (
                    <p className="text-xs text-muted mt-0.5">{member.bio}</p>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 sm:px-10 py-5 flex justify-center">
        <div className="w-full max-w-[480px] flex justify-between items-center">
          <button
            type="button"
            onClick={() => selected && onNext(selected.id, selected.displayName)}
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
