"use client";

import { useActionState } from "react";
import { updateCaseStundensatz } from "../actions";
import { inputCls, labelCls, buttonOutlineCls } from "../case-ui";

export function StundensatzForm({ caseId, stundensatz, basisStundensatz }: { caseId: string; stundensatz: string; basisStundensatz: string }) {
  const [state, formAction, pending] = useActionState(updateCaseStundensatz, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex w-40 flex-col gap-1.5 text-sm">
        <span className={labelCls}>€ je FLS-Std. (leer = {basisStundensatz} €)</span>
        <input name="stundensatz" defaultValue={stundensatz} placeholder={basisStundensatz} className={`w-full ${inputCls}`} />
      </label>
      <button type="submit" disabled={pending} className={buttonOutlineCls}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
