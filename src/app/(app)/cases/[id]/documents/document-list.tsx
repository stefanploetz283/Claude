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
      <thead className="bg-black/5 text-xs uppercase text-black/50">
        <tr>
          <th className="px-4 py-2">Datei</th>
          <th className="px-4 py-2">Kategorie</th>
          <th className="px-4 py-2">Größe</th>
          <th className="px-4 py-2">Hochgeladen am</th>
          <th className="px-4 py-2">Von</th>
          <th className="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr key={d.id} className="border-t border-black/5">
            <td className="px-4 py-2">
              <a
                href={`/api/cases/${caseId}/documents/${d.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                {d.fileName}
              </a>
            </td>
            <td className="px-4 py-2 text-black/60">{d.category ?? "–"}</td>
            <td className="px-4 py-2 text-black/60">{d.sizeLabel}</td>
            <td className="px-4 py-2 whitespace-nowrap text-black/60">{d.uploadedAt}</td>
            <td className="px-4 py-2 text-black/60">{d.uploadedByName}</td>
            <td className="px-4 py-2 text-right">
              <button
                disabled={pending}
                onClick={() => {
                  if (confirm(`"${d.fileName}" wirklich löschen?`)) startTransition(() => deleteDocument(d.id, caseId));
                }}
                className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50"
              >
                Löschen
              </button>
            </td>
          </tr>
        ))}
        {documents.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-6 text-center text-black/40">
              Noch keine Dokumente hochgeladen.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
