"use client";

import { useActionState } from "react";
import { createEmployee } from "./actions";

export function NewEmployeeForm() {
  const [state, formAction, pending] = useActionState(createEmployee, undefined);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neuen Mitarbeiter anlegen</h2>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Name</label>
          <input name="name" required className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">E-Mail</label>
          <input name="email" type="email" required className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Rolle</label>
          <select name="role" className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)]">
            <option value="EMPLOYEE">Fachkraft</option>
            <option value="VERWALTUNG">Verwaltung</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Wird angelegt…" : "Anlegen"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{state.error}</p>}
      {state?.success && (
        <p className="mt-2 text-sm text-[var(--color-green-medium)]">
          {state.success} Temporäres Passwort: <span className="font-mono font-semibold">{state.tempPassword}</span> (bitte sicher
          weitergeben, wird nur einmal angezeigt).
        </p>
      )}
    </div>
  );
}
