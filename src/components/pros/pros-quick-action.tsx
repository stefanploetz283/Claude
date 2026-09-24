// Schnellzugriff-Kachel laut Referenz (.quick), design/PROS-DESIGN-SYSTEM.md Abschnitt 20.
// Reiner Navigations-Shortcut zu bestehenden Routen - keine neue Fachlogik.

import Link from "next/link";

export function ProsQuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[72px] items-center justify-center gap-[15px] rounded-[var(--pros-r-sm)] bg-[var(--pros-sage-pale)]/40 px-3 transition-[transform,background-color,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--pros-sage-pale)] hover:shadow-[var(--pros-shadow)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--pros-sage-soft)] text-[var(--color-primary)]">{icon}</span>
      <span className="text-[13px] font-medium text-[var(--color-text)]">{label}</span>
    </Link>
  );
}
