"use client";

import { useActionState, useTransition } from "react";
import { createHelpType, setHelpTypeArchived } from "./actions";

export function NewHelpTypeForm() {
  const [state, formAction, pending] = useActionState(createHelpType, undefined);
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neue Hilfeart anlegen</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Bezeichnung</label>
          <input name="name" required className="w-64 rounded-md border border-black/15 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Beschreibung (optional)</label>
          <input name="description" className="w-80 rounded-md border border-black/15 px-3 py-1.5 text-sm" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird angelegt…" : "Anlegen"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}

export function ArchiveHelpTypeButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => setHelpTypeArchived(id, !archived))}
      className="text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50"
    >
      {archived ? "Reaktivieren" : "Archivieren"}
    </button>
  );
}
