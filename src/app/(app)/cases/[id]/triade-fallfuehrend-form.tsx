"use client";

import { useActionState } from "react";
import { updateCaseTriadeFallfuehrend } from "../actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

type Employee = { id: string; name: string };

export function TriadeFallfuehrendForm({
  caseId,
  triade,
  fallfuehrendeFachkraftId,
  employees,
}: {
  caseId: string;
  triade: string[];
  fallfuehrendeFachkraftId: string | null;
  employees: Employee[];
}) {
  const [state, formAction, pending] = useActionState(updateCaseTriadeFallfuehrend, undefined);
  const slots = [triade[0] ?? "", triade[1] ?? "", triade[2] ?? ""];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Triade-System 1">
          <input name="triade" defaultValue={slots[0]} placeholder="z.B. Kind" className={inputCls} />
        </Field>
        <Field label="Triade-System 2">
          <input name="triade" defaultValue={slots[1]} placeholder="z.B. Eltern" className={inputCls} />
        </Field>
        <Field label="Triade-System 3">
          <input name="triade" defaultValue={slots[2]} placeholder="z.B. Schule" className={inputCls} />
        </Field>
        <Field label="Fallführende Fachkraft (Ich-Perspektive im Bericht)">
          <select name="fallfuehrendeFachkraftId" defaultValue={fallfuehrendeFachkraftId ?? ""} className={inputCls}>
            <option value="">– nicht festgelegt –</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
