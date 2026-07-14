"use client";

import { useActionState, useState } from "react";
import { sendMessage } from "./actions";

const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

type Employee = { id: string; name: string };
type CaseOption = { id: string; label: string };

export function ComposeForm({
  employees,
  cases,
  defaultRecipientId,
  defaultSubject,
  defaultCaseId,
}: {
  employees: Employee[];
  cases: CaseOption[];
  defaultRecipientId?: string;
  defaultSubject?: string;
  defaultCaseId?: string;
}) {
  const [state, formAction, pending] = useActionState(sendMessage, undefined);
  const [isBroadcast, setIsBroadcast] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-5">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isBroadcast" checked={isBroadcast} onChange={(e) => setIsBroadcast(e.target.checked)} />
        Rundschreiben an das gesamte Team
      </label>

      {!isBroadcast && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-black/60">Empfänger</span>
          <select name="recipientId" defaultValue={defaultRecipientId} className={inputCls}>
            <option value="">Bitte wählen…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Bezug zu Fall (optional)</span>
        <select name="caseId" defaultValue={defaultCaseId ?? ""} className={inputCls}>
          <option value="">Kein Bezug</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Betreff</span>
        <input name="subject" required defaultValue={defaultSubject} className={inputCls} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Nachricht</span>
        <textarea name="body" required rows={5} className={inputCls} />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird gesendet…" : "Senden"}
        </button>
      </div>
    </form>
  );
}
