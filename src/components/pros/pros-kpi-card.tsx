// KPI-Kachel laut Referenz (.kpi / .kpi.primary), design/PROS-DESIGN-SYSTEM.md Abschnitt 3+11.

export function ProsKpiCard({
  icon,
  value,
  label,
  note,
  noteTone = "muted",
  primary = false,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  note?: string;
  noteTone?: "muted" | "alert";
  primary?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[120px] items-center gap-[17px] overflow-hidden rounded-[var(--pros-r-md)] border p-[17px_20px] shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)] ${
        primary ? "border-[var(--pros-sage-soft)] bg-gradient-to-br from-[var(--pros-sage-soft)] to-[#CFDCC8]" : "border-[var(--pros-border-strong)] bg-[var(--color-surface)]"
      }`}
    >
      <div
        className={`grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full ${
          primary ? "bg-[color-mix(in_srgb,var(--color-primary)_56%,transparent)] text-white" : "bg-[var(--pros-sage-soft)] text-[var(--color-primary)]"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[30px] leading-none font-bold text-[var(--color-text)]">{value}</div>
        <div className="mt-1 text-[15px] text-[var(--color-text)]">{label}</div>
        {note && <div className={`mt-1.5 text-xs ${noteTone === "alert" ? "text-[var(--pros-status-critical-text)]" : "text-[var(--pros-meta)]"}`}>{note}</div>}
      </div>
    </div>
  );
}
