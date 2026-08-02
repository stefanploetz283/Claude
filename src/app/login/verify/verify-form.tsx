"use client";

import { useActionState } from "react";
import { verifyLogin, cancelLogin } from "../actions";

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verifyLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm font-medium text-[var(--color-text)]">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Bitte warten…" : "Anmelden"}
      </button>
      <button
        type="button"
        onClick={() => cancelLogin()}
        className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline"
      >
        Abbrechen
      </button>
    </form>
  );
}
