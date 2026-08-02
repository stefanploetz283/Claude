"use client";

import { useActionState } from "react";
import { startLogin } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(startLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <label className="block">
        <span className="mb-[7px] block text-xs font-semibold text-[var(--color-primary)]">E-Mail-Adresse</span>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="name@praxis.de"
          autoComplete="username"
          required
          className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
        />
      </label>
      <label className="block">
        <span className="mb-[7px] block text-xs font-semibold text-[var(--color-primary)]">Passwort</span>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
        />
      </label>

      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-[10px] bg-[var(--color-primary)] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Bitte warten…" : "Anmelden"}
      </button>

      <div className="mt-2 h-[1.5px] bg-[var(--color-gold)]" />
      <div className="text-center text-[11.5px] text-[var(--color-text-muted)]">Version 1.0 — {"Praxis für Systemische Entwicklung"}</div>
    </form>
  );
}
