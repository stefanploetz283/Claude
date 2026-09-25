"use client";

import { useActionState } from "react";
import { updateFachlicheKonzeption, type ActionState } from "./actions";
import { inputCls, buttonPrimaryCls, errorTextCls } from "@/app/(app)/cases/case-ui";

export function FachlicheKonzeptionForm({ text }: { text: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateFachlicheKonzeption, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        name="text"
        aria-label="Fachliche Konzeption"
        defaultValue={text}
        rows={8}
        placeholder="Würdigung als Haltung und Leitbild, personenzentrierte Systemarbeit als fachlicher Ansatz, Regulation/Ressourcen/Passung als zentrale Arbeitsfelder, klärendes/prozessorientiertes/integratives Arbeiten als Arbeitsprinzipien..."
        className={`w-full leading-relaxed ${inputCls}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Speichern…" : "Speichern"}
        </button>
        {state?.error && (
          <p role="alert" className={errorTextCls}>
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
