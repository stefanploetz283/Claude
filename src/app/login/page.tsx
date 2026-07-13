"use client";

import { useActionState } from "react";
import { startLogin } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(startLogin, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/logo.svg" alt="Praxislogo" className="h-14 w-14" />
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Fallverwaltung</h1>
          <p className="text-sm text-black/60">Bitte melden Sie sich an</p>
        </div>

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
      </div>
    </div>
  );
}
