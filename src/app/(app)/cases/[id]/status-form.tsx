"use client";

import { useTransition } from "react";
import { updateCaseStatus } from "../actions";

export function StatusForm({ caseId, currentStatus }: { caseId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => updateCaseStatus(formData))}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Neuer Status</span>
        <select name="newStatus" defaultValue={currentStatus} className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
          <option value="ACTIVE">Aktiv</option>
          <option value="PAUSED">Pausiert</option>
          <option value="COMPLETED">Abgeschlossen</option>
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Grund (optional)</span>
        <input name="reason" className="rounded-md border border-black/15 px-3 py-1.5 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Wird gespeichert…" : "Status ändern"}
      </button>
    </form>
  );
}
