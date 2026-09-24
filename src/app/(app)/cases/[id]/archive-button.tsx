"use client";

import { useTransition } from "react";
import { archiveCase } from "../actions";
import { buttonDangerOutlineCls } from "../case-ui";

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
      className={buttonDangerOutlineCls}
    >
      {pending ? "Wird archiviert…" : "Fall archivieren"}
    </button>
  );
}
