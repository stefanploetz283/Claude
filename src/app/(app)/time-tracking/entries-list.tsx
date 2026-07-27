"use client";

import { useTransition } from "react";
import { deleteTimeEntry } from "./actions";

export type TimeEntryRow = {
  id: string;
  date: string;
  timeLabel: string;
  durationHours: number;
  label: string;
  note: string | null;
};

export function EntriesList({ entries, canDelete }: { entries: TimeEntryRow[]; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
        <tr>
          <th className="px-5 py-3">Datum</th>
          <th className="px-5 py-3">Zeit</th>
          <th className="px-5 py-3">Dauer</th>
          <th className="px-5 py-3">Zuordnung</th>
          <th className="px-5 py-3">Notiz</th>
          {canDelete && <th className="px-5 py-3"></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t border-[var(--color-border)]">
            <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{e.date}</td>
            <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{e.timeLabel}</td>
            <td className={`px-5 py-3 font-semibold whitespace-nowrap ${e.durationHours < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text)]"}`}>
              {e.durationHours.toFixed(2)} Std.
            </td>
            <td className="px-5 py-3 text-[var(--color-text)]">{e.label}</td>
            <td className="px-5 py-3 text-[var(--color-text-muted)]">{e.note ?? "–"}</td>
            {canDelete && (
              <td className="px-5 py-3 text-right">
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Eintrag wirklich löschen?")) startTransition(() => deleteTimeEntry(e.id));
                  }}
                  className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
                >
                  Löschen
                </button>
              </td>
            )}
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
              Keine Einträge in diesem Monat.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
