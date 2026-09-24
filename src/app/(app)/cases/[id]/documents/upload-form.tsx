"use client";

import { useActionState, useRef } from "react";
import { uploadDocument } from "./actions";
import { inputCls, labelCls, buttonPrimaryCls } from "../../case-ui";

export function UploadForm({ caseId }: { caseId: string }) {
  const [state, formAction, pending] = useActionState(uploadDocument, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-4 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Datei</span>
        <input name="file" type="file" required className="text-sm text-[var(--color-text)]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Kategorie (optional)</span>
        <select name="category" className={inputCls}>
          <option value="">Keine</option>
          <option value="Bewilligungsbescheid">Bewilligungsbescheid</option>
          <option value="Bericht">Bericht</option>
          <option value="Einverständniserklärung">Einverständniserklärung</option>
          <option value="Sonstiges">Sonstiges</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className={buttonPrimaryCls}>
        {pending ? "Wird hochgeladen…" : "Hochladen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
