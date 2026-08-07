// Gemeinsame visuelle Hülle für die linke Spalte - von der normalen Sidebar UND den kontextuellen
// Unter-Navigationen (Mitarbeiter/Finanzen) genutzt, damit der Wechsel zwischen ihnen nahtlos wirkt.
export function SidebarShell({ children }: { children: React.ReactNode }) {
  return (
    <aside className="relative hidden min-h-[600px] w-[288px] flex-none overflow-hidden bg-[var(--color-primary)] px-[22px] py-[28px] lg:block">
      <svg viewBox="0 0 288 560" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute top-0 left-0 h-full w-full" aria-hidden="true">
        <g style={{ isolation: "isolate" }}>
          <circle cx="70" cy="150" r="150" fill="var(--color-sage)" style={{ mixBlendMode: "multiply" }} />
          <circle cx="200" cy="300" r="140" fill="var(--color-gold)" style={{ mixBlendMode: "multiply" }} />
        </g>
        <g fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6">
          <circle cx="70" cy="150" r="150" />
          <circle cx="200" cy="300" r="140" />
        </g>
      </svg>
      {children}
    </aside>
  );
}
