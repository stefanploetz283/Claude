"use client";

import { useTransition } from "react";
import { updateCaseStatus } from "../actions";
import { inputCls, labelCls, buttonOutlineCls } from "../case-ui";

export function StatusForm({ caseId, currentStatus }: { caseId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => updateCaseStatus(formData))}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Neuer Status</span>
        <select name="newStatus" defaultValue={currentStatus} className={inputCls}>
          <option value="ACTIVE">Aktiv</option>
          <option value="PAUSED">Pausiert</option>
          <option value="COMPLETED">Abgeschlossen</option>
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1.5">
        <span className={labelCls}>Grund (optional)</span>
        <input name="reason" className={`w-full ${inputCls}`} />
      </label>
      <button type="submit" disabled={pending} className={buttonOutlineCls}>
        {pending ? "Wird gespeichert…" : "Status ändern"}
      </button>
    </form>
  );
}
