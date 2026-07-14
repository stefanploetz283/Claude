"use client";

import { useActionState } from "react";
import { startLogin } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(startLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-[var(--color-text)]">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-[var(--color-text)]">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Bitte warten…" : "Weiter"}
      </button>
    </form>
  );
}
