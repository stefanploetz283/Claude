"use client";

import { useActionState } from "react";
import { verifyLogin, cancelLogin } from "../actions";
import { buttonPrimaryCls, errorTextCls } from "@/app/(app)/cases/case-ui";

// Großes, zentriertes Code-Feld - eigenes Größen-Set statt case-ui.inputCls (text-2xl statt text-sm).
const codeCls =
  "w-full min-h-14 rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3.5 text-center text-2xl font-semibold tracking-[0.4em] text-[var(--color-text)] tabular-nums outline-none transition-colors [text-indent:0.4em] focus:border-[var(--color-primary)]";

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verifyLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-[13px] font-semibold text-[var(--color-primary)]">
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
          className={codeCls}
        />
      </div>

      {state?.error && (
        <p role="alert" className={errorTextCls}>
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${buttonPrimaryCls} w-full min-h-12`}>
        {pending ? "Bitte warten…" : "Anmelden"}
      </button>
      <button
        type="button"
        onClick={() => cancelLogin()}
        className="min-h-11 rounded-[var(--pros-r-sm)] text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] hover:underline"
      >
        Abbrechen
      </button>
    </form>
  );
}
