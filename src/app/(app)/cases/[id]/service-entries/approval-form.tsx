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
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Wird eingereicht…" : "Leistungsdokumentation abschließen"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
