"use client";

import { useActionState } from "react";
import { createEmployee } from "./actions";

export function NewEmployeeForm() {
  const [state, formAction, pending] = useActionState(createEmployee, undefined);

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neuen Mitarbeiter anlegen</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Name</label>
          <input name="name" required className="rounded-md border border-black/15 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">E-Mail</label>
          <input name="email" type="email" required className="rounded-md border border-black/15 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-black/60">Rolle</label>
          <select name="role" className="rounded-md border border-black/15 px-3 py-1.5 text-sm">
            <option value="EMPLOYEE">Mitarbeiter</option>
            <option value="ADMIN">Admin</option>
          </select>
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
      {state?.success && (
        <p className="mt-2 text-sm text-green-700">
          {state.success} Temporäres Passwort: <span className="font-mono font-semibold">{state.tempPassword}</span> (bitte sicher
          weitergeben, wird nur einmal angezeigt).
        </p>
      )}
    </div>
  );
}
