// Wiederkehrender Diktat-Aufnahme-Button (Kalender-, Dokumentations- und Diktat-Widgets) -
// vorher an vier Stellen fast identisch dupliziert. Reine Darstellung: Aufnahme starten/stoppen
// bleibt beim Aufrufer. Farben/Zustände gemäß design/PROS-DESIGN-SYSTEM.md (Petrol = bereit,
// Critical-Text = Aufnahme läuft - eindeutig von normalen Aktionen unterscheidbar).

const SIZE_CLS = { md: "h-16 w-16", lg: "h-20 w-20" } as const;
const ICON_SIZE = { md: 24, lg: 28 } as const;

export function ProsMicButton({
  recording,
  onClick,
  disabled = false,
  size = "md",
}: {
  recording: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  if (recording) {
    return (
      <button
        onClick={onClick}
        className={`flex ${SIZE_CLS[size]} items-center justify-center rounded-full bg-[var(--pros-status-critical-text)] text-white shadow-[var(--pros-shadow)] transition-transform duration-[170ms] ease-[var(--pros-ease)] active:scale-[0.97]`}
        aria-label="Aufnahme stoppen"
      >
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex ${SIZE_CLS[size]} items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100`}
      aria-label="Aufnahme starten"
    >
      <svg width={ICON_SIZE[size]} height={ICON_SIZE[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </button>
  );
}
