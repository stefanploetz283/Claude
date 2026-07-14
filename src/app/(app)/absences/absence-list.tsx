"use client";

import { useTransition } from "react";
import { deleteAbsence } from "./actions";

export type AbsenceRow = {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  note: string | null;
  canDelete: boolean;
};

const TYPE_LABELS: Record<string, string> = { URLAUB: "Urlaub", KRANK: "Krank", SONSTIGES: "Sonstiges" };

export function AbsenceList({ rows, showEmployee }: { rows: AbsenceRow[]; showEmployee: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-black/5 text-xs uppercase text-black/50">
        <tr>
          {showEmployee && <th className="px-4 py-2">Mitarbeiter</th>}
          <th className="px-4 py-2">Art</th>
          <th className="px-4 py-2">Von</th>
          <th className="px-4 py-2">Bis</th>
          <th className="px-4 py-2">Notiz</th>
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-black/5">
            {showEmployee && <td className="px-4 py-2">{r.employeeName}</td>}
            <td className="px-4 py-2">{TYPE_LABELS[r.type] ?? r.type}</td>
            <td className="px-4 py-2 whitespace-nowrap">{r.startDate}</td>
            <td className="px-4 py-2 whitespace-nowrap">{r.endDate}</td>
            <td className="px-4 py-2 text-black/60">{r.note ?? "–"}</td>
            <td className="px-4 py-2 text-right">
              {r.canDelete && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Eintrag wirklich löschen?")) startTransition(() => deleteAbsence(r.id));
                  }}
                  className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
                >
                  Löschen
                </button>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={showEmployee ? 6 : 5} className="px-4 py-6 text-center text-black/40">
              Keine Einträge.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
