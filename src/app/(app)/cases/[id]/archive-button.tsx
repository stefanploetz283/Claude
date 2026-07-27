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
      className="rounded-[var(--radius-control)] border border-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-coral)] transition hover:bg-[var(--color-coral)] hover:text-white disabled:opacity-50"
    >
      {pending ? "Wird archiviert…" : "Fall archivieren"}
    </button>
  );
}
