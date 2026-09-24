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
      <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
        <tr>
          {showEmployee && <th className="px-4 py-3">Mitarbeiter</th>}
          <th className="px-4 py-3">Art</th>
          <th className="px-4 py-3">Von</th>
          <th className="px-4 py-3">Bis</th>
          <th className="px-4 py-3">Notiz</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40">
            {showEmployee && <td className="px-4 py-3 font-medium text-[var(--color-text)]">{r.employeeName}</td>}
            <td className="px-4 py-3 text-[var(--color-text)]">{TYPE_LABELS[r.type] ?? r.type}</td>
            <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{r.startDate}</td>
            <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{r.endDate}</td>
            <td className="px-4 py-3 text-[var(--color-text-muted)]">{r.note ?? "–"}</td>
            <td className="px-4 py-3 text-right">
              {r.canDelete && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Eintrag wirklich löschen?")) startTransition(() => deleteAbsence(r.id));
                  }}
                  className="text-xs font-medium text-[var(--pros-status-critical-text)] hover:underline disabled:opacity-50"
                >
                  Löschen
                </button>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={showEmployee ? 6 : 5} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
              Keine Einträge.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
