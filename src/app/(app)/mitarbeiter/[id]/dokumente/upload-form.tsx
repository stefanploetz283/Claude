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
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]"
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
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)]"
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
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Wird hochgeladen…" : "Hochladen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
