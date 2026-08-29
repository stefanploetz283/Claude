"use client";

import { useActionState } from "react";
import { updateFachlicheKonzeption, type ActionState } from "./actions";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function FachlicheKonzeptionForm({ text }: { text: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateFachlicheKonzeption, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        name="text"
        defaultValue={text}
        rows={8}
        placeholder="Würdigung als Haltung und Leitbild, personenzentrierte Systemarbeit als fachlicher Ansatz, Regulation/Ressourcen/Passung als zentrale Arbeitsfelder, klärendes/prozessorientiertes/integratives Arbeiten als Arbeitsprinzipien..."
        className={inputCls}
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
