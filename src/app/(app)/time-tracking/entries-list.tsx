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
      <thead className="bg-black/5 text-xs uppercase text-black/50">
        <tr>
          <th className="px-4 py-2">Datum</th>
          <th className="px-4 py-2">Zeit</th>
          <th className="px-4 py-2">Dauer</th>
          <th className="px-4 py-2">Zuordnung</th>
          <th className="px-4 py-2">Notiz</th>
          {canDelete && <th className="px-4 py-2"></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t border-black/5">
            <td className="px-4 py-2 whitespace-nowrap">{e.date}</td>
            <td className="px-4 py-2 whitespace-nowrap text-black/60">{e.timeLabel}</td>
            <td className={`px-4 py-2 whitespace-nowrap ${e.durationHours < 0 ? "text-[var(--color-danger)]" : ""}`}>
              {e.durationHours.toFixed(2)} Std.
            </td>
            <td className="px-4 py-2">{e.label}</td>
            <td className="px-4 py-2 text-black/60">{e.note ?? "–"}</td>
            {canDelete && (
              <td className="px-4 py-2 text-right">
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Eintrag wirklich löschen?")) startTransition(() => deleteTimeEntry(e.id));
                  }}
                  className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
                >
                  Löschen
                </button>
              </td>
            )}
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-6 text-center text-black/40">
              Keine Einträge in diesem Monat.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
