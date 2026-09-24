"use client";

import { useActionState, useRef } from "react";
import { createAufgabe, type ActionState } from "./actions";
import { inputCls, labelCls, buttonPrimaryCls, cardCls } from "../cases/case-ui";

export function AufgabeForm({ caseOptions }: { caseOptions: { id: string; label: string }[] | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAufgabe, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className={`flex flex-wrap items-end gap-3 ${cardCls}`}
    >
      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className={labelCls}>Neue Aufgabe</span>
        <input name="titel" required placeholder="z.B. Jugendamt zurückrufen" className={`w-full ${inputCls}`} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Fällig am</span>
        <input name="faelligAm" type="date" className={inputCls} />
      </label>
      {caseOptions && (
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Fall (optional)</span>
          <select name="caseId" defaultValue="" className={inputCls}>
            <option value="">Kein Fallbezug</option>
            {caseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" disabled={pending} className={buttonPrimaryCls}>
        {pending ? "Wird angelegt…" : "+ Aufgabe anlegen"}
      </button>
      {state?.error && <p className="w-full text-sm font-medium text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
