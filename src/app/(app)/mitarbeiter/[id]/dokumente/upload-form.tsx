"use client";

import { useActionState, useRef } from "react";
import { uploadEmployeeDocument } from "./actions";

export function UploadForm({ employeeId }: { employeeId: string }) {
  const [state, formAction, pending] = useActionState(uploadEmployeeDocument, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-4 shadow-[var(--pros-shadow)]"
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Datei</span>
        <input name="file" type="file" required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Kategorie</span>
        <select
          name="category"
          className="rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)]"
        >
          <option value="Lohnabrechnung">Lohnabrechnung</option>
          <option value="Arbeitsvertrag">Arbeitsvertrag</option>
          <option value="Führungszeugnis">Führungszeugnis</option>
          <option value="Sonstiges">Sonstiges</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
      >
        {pending ? "Wird hochgeladen…" : "Hochladen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}
