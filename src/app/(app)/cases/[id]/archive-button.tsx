"use client";

import { useTransition } from "react";
import { archiveCase } from "../actions";

export function ArchiveCaseButton({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Fall wirklich archivieren? Er wird nicht gelöscht, sondern nur aus der aktiven Übersicht ausgeblendet.")) {
          startTransition(() => archiveCase(caseId));
        }
      }}
      className="rounded-md border border-[var(--color-danger)] px-4 py-1.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white disabled:opacity-50"
    >
      {pending ? "Wird archiviert…" : "Fall archivieren"}
    </button>
  );
}
