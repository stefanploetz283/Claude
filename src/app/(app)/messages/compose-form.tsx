"use client";

import { useActionState, useState } from "react";
import { sendMessage } from "./actions";
import { cardCls, inputCls, labelCls, buttonPrimaryCls, errorTextCls } from "@/app/(app)/cases/case-ui";

const fieldCls = `w-full ${inputCls}`;

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
    <form action={formAction} className={`${cardCls} flex max-w-2xl flex-col gap-4`}>
      <label className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          name="isBroadcast"
          checked={isBroadcast}
          onChange={(e) => setIsBroadcast(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
        />
        Rundschreiben an das gesamte Team
      </label>

      {!isBroadcast && (
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Empfänger</span>
          <select name="recipientId" defaultValue={defaultRecipientId} className={fieldCls}>
            <option value="">Bitte wählen…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Bezug zu Fall (optional)</span>
        <select name="caseId" defaultValue={defaultCaseId ?? ""} className={fieldCls}>
          <option value="">Kein Bezug</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Betreff</span>
        <input name="subject" required defaultValue={defaultSubject} className={fieldCls} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Nachricht</span>
        <textarea name="body" required rows={6} className={`${fieldCls} leading-relaxed`} />
      </label>

      {state?.error && (
        <p role="alert" className={errorTextCls}>
          {state.error}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Wird gesendet…" : "Senden"}
        </button>
      </div>
    </form>
  );
}
