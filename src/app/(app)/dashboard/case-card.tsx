import Link from "next/link";
import type { CaseStatus } from "@prisma/client";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";

const STATUS_LABELS: Record<CaseStatus, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
};

const STATUS_TONE: Record<CaseStatus, "active" | "attention" | "stable"> = {
  ACTIVE: "active",
  PAUSED: "attention",
  COMPLETED: "stable",
};

function ProgressRing({ percent, warn }: { percent: number; warn: boolean }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const stroke = warn ? "var(--color-gold)" : "var(--pros-progress-fill)";

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--pros-progress-track)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          strokeDashoffset: offset,
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </svg>
  );
}

export function CaseCard({
  caseId,
  clientName,
  helpTypeName,
  substituteName,
  status,
  remaining,
  contingent,
  remainingPercent,
  warn,
  index,
}: {
  caseId: string;
  clientName: string;
  helpTypeName: string;
  substituteName: string | null;
  status: CaseStatus;
  remaining: number;
  contingent: number;
  remainingPercent: number;
  warn: boolean;
  index: number;
}) {
  return (
    <Link
      href={`/cases/${caseId}`}
      className="dash-card-enter group flex items-center gap-4 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)] active:scale-[0.98] active:duration-100"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative flex shrink-0 items-center justify-center">
        <ProgressRing percent={remainingPercent} warn={warn} />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-bold"
          style={{ color: warn ? "var(--pros-status-attention-text)" : "var(--color-primary)" }}
        >
          {Math.round(remainingPercent)}%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{clientName}</span>
          <ProsStatusPill tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</ProsStatusPill>
        </div>
        <div className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{helpTypeName}</div>
        {substituteName && <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">Vertr.: {substituteName}</div>}
        <div className="mt-2 text-sm">
          <span className={warn ? "font-semibold text-[var(--pros-status-attention-text)]" : "text-[var(--color-text)]"}>
            {remaining.toFixed(1)} von {contingent.toFixed(1)} Std. übrig
          </span>
          {warn && <div className="text-xs text-[var(--pros-status-attention-text)]">Kontingent läuft bald aus</div>}
        </div>
      </div>
    </Link>
  );
}
