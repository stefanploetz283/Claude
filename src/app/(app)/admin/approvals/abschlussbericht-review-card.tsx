"use client";

import { useState, useTransition, useActionState } from "react";
import { approveAbschlussbericht, requestAbschlussberichtCorrection } from "./actions";
import { IconChevronDown } from "@/components/pros/pros-icons";
import { buttonPrimaryCls, buttonDangerOutlineCls, buttonDangerSolidCls, inputCls, errorTextCls, linkActionCls } from "@/app/(app)/cases/case-ui";

export function AbschlussberichtReviewCard({
  caseId,
  clientName,
  helpTypeName,
  fallfuehrendeFachkraftName,
  submittedAt,
  text,
}: {
  caseId: string;
  clientName: string;
  helpTypeName: string;
  fallfuehrendeFachkraftName: string;
  submittedAt: string;
  text: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showCorrection, setShowCorrection] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, correctionPending] = useActionState(requestAbschlussberichtCorrection, undefined);

  return (
    <div className="rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{clientName} · Abschlussbericht</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {helpTypeName} · Ich-Perspektive: {fallfuehrendeFachkraftName} · Eingereicht am {submittedAt}
          </p>
        </div>
      </div>

      <div
        className={`mt-3 overflow-y-auto rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] p-4 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)] ${expanded ? "max-h-[32rem]" : "max-h-40"}`}
      >
        {text}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={`mt-2 inline-flex items-center gap-1 ${linkActionCls}`}
      >
        <IconChevronDown size={14} className={`transition-transform duration-[170ms] motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Einklappen" : "Vollständig anzeigen"}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button disabled={pending} onClick={() => startTransition(() => approveAbschlussbericht(caseId))} className={buttonPrimaryCls}>
          Freigeben
        </button>
        <button disabled={pending} onClick={() => setShowCorrection((v) => !v)} aria-expanded={showCorrection} className={buttonDangerOutlineCls}>
          Korrektur anfordern
        </button>
      </div>

      {showCorrection && (
        <form action={formAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="caseId" value={caseId} />
          <textarea
            name="comment"
            required
            rows={3}
            aria-label="Korrekturhinweis"
            placeholder="Was muss an dem Bericht korrigiert werden?"
            className={`w-full ${inputCls}`}
          />
          <button type="submit" disabled={correctionPending} className={`self-start ${buttonDangerSolidCls}`}>
            {correctionPending ? "Wird gesendet…" : "Korrektur senden"}
          </button>
          {state?.error && (
            <p role="alert" className={errorTextCls}>
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
