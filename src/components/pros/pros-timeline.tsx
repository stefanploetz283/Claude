// Tagesüberblick-Timeline laut Referenz (.timeline), design/PROS-DESIGN-SYSTEM.md Abschnitt 11/20.

export type ProsTimelineEntry = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
};

export function ProsTimeline({ entries }: { entries: ProsTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--pros-meta)]">Keine Termine heute.</p>;
  }

  return (
    <ul className="relative mt-1.5">
      <li className="pointer-events-none absolute top-[11px] bottom-4 left-[19px] w-px bg-[#D4D9D0]" aria-hidden="true" />
      {entries.map((e) => (
        <li key={e.id} className="relative grid min-h-16 grid-cols-[47px_40px_minmax(0,1fr)] items-center gap-0">
          <span className="text-xs text-[#566B6C]">{e.time}</span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--pros-sage-soft)] text-[var(--color-primary)]">{e.icon}</span>
          <div className="min-w-0 border-b border-[var(--pros-border-default)] py-3 last:border-b-0">
            <div className="truncate text-sm font-bold text-[var(--color-text)]">{e.title}</div>
            {e.subtitle && <div className="mt-0.5 truncate text-xs text-[#67797A]">{e.subtitle}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
