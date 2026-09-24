"use client";

import { useTransition } from "react";
import { deleteDocument } from "./actions";

export type DocumentRow = {
  id: string;
  fileName: string;
  category: string | null;
  sizeLabel: string;
  uploadedAt: string;
  uploadedByName: string;
};

export function DocumentList({ caseId, documents }: { caseId: string; documents: DocumentRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
        <tr>
          <th className="px-5 py-3">Datei</th>
          <th className="px-5 py-3">Kategorie</th>
          <th className="px-5 py-3">Größe</th>
          <th className="px-5 py-3">Hochgeladen am</th>
          <th className="px-5 py-3">Von</th>
          <th className="px-5 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr key={d.id} className="border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40">
            <td className="px-5 py-3">
              <a
                href={`/api/cases/${caseId}/documents/${d.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                {d.fileName}
              </a>
            </td>
            <td className="px-5 py-3 text-[var(--color-text-muted)]">{d.category ?? "–"}</td>
            <td className="px-5 py-3 text-[var(--color-text-muted)]">{d.sizeLabel}</td>
            <td className="px-5 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{d.uploadedAt}</td>
            <td className="px-5 py-3 text-[var(--color-text-muted)]">{d.uploadedByName}</td>
            <td className="px-5 py-3 text-right">
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(`"${d.fileName}" endgültig löschen? Dies kann nicht rückgängig gemacht werden.`)) {
                    startTransition(() => deleteDocument(d.id, caseId));
                  }
                }}
                className="text-xs font-semibold text-[var(--pros-status-critical-text)] hover:underline disabled:opacity-50"
              >
                Endgültig löschen
              </button>
            </td>
          </tr>
        ))}
        {documents.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-muted)]">
              Noch keine Dokumente hochgeladen.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
