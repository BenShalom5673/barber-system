interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function DateTimeStep({ onNext, onBack }: Props) {
  return (
    <div className="p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-[480px]">

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-1">בחר תאריך ושעה</h2>
          <p className="text-sm text-muted">מתי תרצה להגיע?</p>
        </div>

        <div className="mb-10 min-h-[200px] rounded-card border border-border bg-surface flex items-center justify-center">
          <p className="text-sm text-muted">לוח שנה ושעות — יתווסף בשלב הבא</p>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-button transition-colors"
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
