"use client";

import { useActionState } from "react";
import { submitForApproval } from "./actions";

export function ApprovalForm({ caseId, year, month }: { caseId: string; year: number; month: number }) {
  const [state, formAction, pending] = useActionState(submitForApproval, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2" key={`${year}-${month}`}>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
      >
        {pending ? "Wird eingereicht…" : "Leistungsdokumentation abschließen"}
      </button>
      {state?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
