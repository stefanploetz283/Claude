"use client";

import { useActionState, useRef } from "react";
import { uploadDocument } from "./actions";

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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Datei</span>
        <input name="file" type="file" required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-black/60">Kategorie (optional)</span>
        <select name="category" className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
          <option value="">Keine</option>
          <option value="Bewilligungsbescheid">Bewilligungsbescheid</option>
          <option value="Bericht">Bericht</option>
          <option value="Einverständniserklärung">Einverständniserklärung</option>
          <option value="Sonstiges">Sonstiges</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Wird hochgeladen…" : "Hochladen"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
