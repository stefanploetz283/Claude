"use client";

import { useTransition } from "react";
import { deleteEmployeeDocument } from "./actions";

export type EmployeeDocumentRow = {
  id: string;
  fileName: string;
  category: string | null;
  sizeLabel: string;
  uploadedAt: string;
  uploadedByName: string;
};

export function DocumentList({ employeeId, documents }: { employeeId: string; documents: EmployeeDocumentRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
        <tr>
          <th className="px-4 py-2">Datei</th>
          <th className="px-4 py-2">Kategorie</th>
          <th className="px-4 py-2">Größe</th>
          <th className="px-4 py-2">Hochgeladen am</th>
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr key={d.id} className="border-t border-[var(--color-border)]">
            <td className="px-4 py-2">
              <a
                href={`/api/mitarbeiter/${employeeId}/dokumente/${d.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                {d.fileName}
              </a>
            </td>
            <td className="px-4 py-2 text-[var(--color-text-muted)]">{d.category ?? "–"}</td>
            <td className="px-4 py-2 text-[var(--color-text-muted)]">{d.sizeLabel}</td>
            <td className="px-4 py-2 whitespace-nowrap text-[var(--color-text-muted)]">
              {d.uploadedAt} · {d.uploadedByName}
            </td>
            <td className="px-4 py-2 text-right">
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(`"${d.fileName}" wirklich löschen?`)) startTransition(() => deleteEmployeeDocument(d.id, employeeId));
                }}
                className="text-xs text-[var(--color-coral)] hover:underline disabled:opacity-50"
              >
                Löschen
              </button>
            </td>
          </tr>
        ))}
        {documents.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
              Noch keine Dokumente hochgeladen.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
