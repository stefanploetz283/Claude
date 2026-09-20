"use client";

import { useTransition, startTransition } from "react";
import { toggleAufgabe, deleteAufgabe } from "./actions";

export type AufgabeRow = {
  id: string;
  titel: string;
  faelligAm: string | null; // ISO-Datum
  erledigt: boolean;
  clientName: string | null;
};

function formatFaellig(iso: string | null): { text: string; overdue: boolean } | null {
  if (!iso) return null;
  const date = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const text = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  if (diffDays === 0) return { text: "Heute", overdue: false };
  if (diffDays === 1) return { text: "Morgen", overdue: false };
  return { text, overdue: diffDays < 0 };
}

export function AufgabenListe({ aufgaben, compact = false }: { aufgaben: AufgabeRow[]; compact?: boolean }) {
  const [, startPending] = useTransition();

  if (aufgaben.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Keine offenen Aufgaben.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {aufgaben.map((a) => {
        const faellig = formatFaellig(a.faelligAm);
        return (
          <li
            key={a.id}
            className="group flex items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 transition-colors duration-150 hover:bg-[var(--color-bg)]"
          >
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  startPending(async () => {
                    await toggleAufgabe(a.id, !a.erledigt);
                  });
                })
              }
              aria-pressed={a.erledigt}
              aria-label={a.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 ${
                a.erledigt ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }`}
            >
              {a.erledigt && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm ${a.erledigt ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text)]"}`}>{a.titel}</div>
              {a.clientName && !compact && <div className="truncate text-xs text-[var(--color-text-muted)]">{a.clientName}</div>}
            </div>

            {faellig && !a.erledigt && (
              <span className={`shrink-0 text-xs font-medium ${faellig.overdue ? "text-[var(--color-coral)]" : "text-[var(--color-text-muted)]"}`}>
                {faellig.text}
              </span>
            )}

            {!compact && (
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    startPending(async () => {
                      await deleteAufgabe(a.id);
                    });
                  })
                }
                aria-label="Aufgabe löschen"
                className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-[var(--color-coral)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
