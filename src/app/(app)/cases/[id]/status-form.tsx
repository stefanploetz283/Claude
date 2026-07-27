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
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Neuer Status</span>
        <select
          name="newStatus"
          defaultValue={currentStatus}
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]"
        >
          <option value="ACTIVE">Aktiv</option>
          <option value="PAUSED">Pausiert</option>
          <option value="COMPLETED">Abgeschlossen</option>
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Grund (optional)</span>
        <input name="reason" className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Wird gespeichert…" : "Status ändern"}
      </button>
    </form>
  );
}
