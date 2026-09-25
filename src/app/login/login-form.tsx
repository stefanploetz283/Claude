"use client";

import { useActionState } from "react";
import { startLogin } from "./actions";
import { inputCls, buttonPrimaryCls, errorTextCls } from "@/app/(app)/cases/case-ui";

const fieldCls = `w-full min-h-12 placeholder:text-[var(--pros-meta)] ${inputCls}`;
const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--color-primary)]";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(startLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="block">
        <span className={labelCls}>E-Mail-Adresse</span>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="name@praxis.de"
          autoComplete="username"
          required
          className={fieldCls}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Passwort</span>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className={fieldCls}
        />
      </label>

      {state?.error && (
        <p role="alert" className={errorTextCls}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonPrimaryCls} mt-1 w-full min-h-12`}>
        {pending ? "Bitte warten…" : "Anmelden"}
      </button>

      <div className="mt-2 h-[1.5px] bg-[var(--color-gold)]" />
      <div className="text-center text-xs text-[var(--color-text-muted)]">Version 1.0 — {"Praxis für Systemische Entwicklung"}</div>
    </form>
  );
}
