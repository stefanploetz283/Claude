// Gemeinsame PROS-Card-Bausteine, siehe design/PROS-DESIGN-SYSTEM.md Abschnitt 11 (Card System).
// Reine Präsentationskomponenten - keine eigene Datenlogik.

export function ProsCard({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)] ${
        interactive ? "transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ProsSectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ProsCard className={`p-[18px] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3.5">
        <h2 className="text-[19px] leading-[1.2] font-bold tracking-[-0.015em] text-[var(--color-text)]">{title}</h2>
        {action}
      </div>
      {children}
    </ProsCard>
  );
}
