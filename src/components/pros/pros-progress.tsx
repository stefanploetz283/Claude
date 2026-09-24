// Fortschrittsbalken laut Referenz (.progress), design/PROS-DESIGN-SYSTEM.md Abschnitt 3.

export function ProsProgress({ percent, warn = false }: { percent: number; warn?: boolean }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-[7px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--pros-progress-track)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-[var(--pros-ease)]"
        style={{ width: `${clamped}%`, background: warn ? "var(--color-gold)" : "var(--pros-progress-fill)" }}
      />
    </div>
  );
}
