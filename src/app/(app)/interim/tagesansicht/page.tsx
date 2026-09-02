import Link from "next/link";
import { TagesansichtClient } from "./tagesansicht-client";

export default function TagesansichtPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/interim" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück zum Interims-Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-primary)]">Tagesansicht</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Alle an einem Tag erfassten Einträge über alle Fälle hinweg, sortiert nach Startzeit.
        </p>
      </div>

      <TagesansichtClient />
    </div>
  );
}
