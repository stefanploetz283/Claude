// Status-System laut design/PROS-DESIGN-SYSTEM.md Abschnitt 12.

const TONES = {
  active: { bg: "var(--pros-status-active-bg)", text: "var(--pros-status-active-text)" },
  attention: { bg: "var(--pros-status-attention-bg)", text: "var(--pros-status-attention-text)" },
  stable: { bg: "var(--pros-status-stable-bg)", text: "var(--pros-status-stable-text)" },
  critical: { bg: "var(--pros-status-critical-bg)", text: "var(--pros-status-critical-text)" },
  archived: { bg: "var(--pros-status-archived-bg)", text: "var(--pros-status-archived-text)" },
} as const;

export function ProsStatusPill({ tone, children, className = "" }: { tone: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex w-fit min-w-[80px] items-center justify-center rounded-full px-[11px] py-[5px] text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: t.bg, color: t.text }}
    >
      {children}
    </span>
  );
}
