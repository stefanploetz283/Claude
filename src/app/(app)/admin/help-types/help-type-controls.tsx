"use client";

import { useActionState, useTransition } from "react";
import { createHelpType, setHelpTypeArchived } from "./actions";
import { cardCls, inputCls, labelCls, buttonPrimaryCls, errorTextCls } from "@/app/(app)/cases/case-ui";

export function NewHelpTypeForm() {
  const [state, formAction, pending] = useActionState(createHelpType, undefined);
  return (
    <div className={cardCls}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neue Hilfeart anlegen</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Bezeichnung</span>
          <input name="name" required className={`w-full sm:w-64 ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Beschreibung (optional)</span>
          <input name="description" className={`w-full sm:w-80 ${inputCls}`} />
        </label>
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Wird angelegt…" : "Anlegen"}
        </button>
      </form>
      {state?.error && (
        <p role="alert" className={`mt-2 ${errorTextCls}`}>
          {state.error}
        </p>
      )}
    </div>
  );
}

export function ArchiveHelpTypeButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} onClick={() => startTransition(() => setHelpTypeArchived(id, !archived))} className="text-sm font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50">
      {archived ? "Reaktivieren" : "Archivieren"}
    </button>
  );
}
