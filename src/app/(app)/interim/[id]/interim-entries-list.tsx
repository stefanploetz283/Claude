"use client";

import { useTransition } from "react";
import { deleteInterimEntry } from "../actions";

export type InterimEntryRow = { id: string; date: string; timeLabel: string; content: string };

export function InterimEntriesList({ caseId, entries }: { caseId: string; entries: InterimEntryRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
        <tr>
          <th className="px-5 py-3">Datum</th>
          <th className="px-5 py-3">Zeit</th>
          <th className="px-5 py-3">Inhalt</th>
          <th className="px-5 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t border-[var(--color-border)]">
            <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{e.date}</td>
            <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{e.timeLabel}</td>
            <td className="px-5 py-3 text-[var(--color-text)]">{e.content}</td>
            <td className="px-5 py-3 text-right">
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm("Eintrag wirklich löschen?")) startTransition(() => deleteInterimEntry(e.id, caseId));
                }}
                className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
              >
                Löschen
              </button>
            </td>
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
              Noch keine Einträge für diesen Fall.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
