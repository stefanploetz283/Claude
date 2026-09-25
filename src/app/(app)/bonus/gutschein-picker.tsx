"use client";

import { useActionState } from "react";
import { selectGutschein, type ActionState } from "./actions";
import { GUTSCHEIN_STYLES, type GutscheinAnbieterKey } from "@/lib/bonus-colors";
import { errorTextCls } from "@/app/(app)/cases/case-ui";

// Die Anbieterfarben (Edeka, dm, MediaMarkt) sind die Markenidentität des jeweiligen Gutscheins - sie tragen
// Wiedererkennung, nicht Status, und bleiben deshalb bewusst unverändert. Form, Schatten und Bewegung folgen dem PROS-System.
export function GutscheinPicker({
  year,
  month,
  monthLabel,
  selected,
}: {
  year: number;
  month: number;
  monthLabel: string;
  selected: GutscheinAnbieterKey | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(selectGutschein, undefined);

  return (
    <div>
      <h2 className="mb-3 text-[19px] leading-[1.2] font-bold tracking-[-0.015em] text-[var(--color-text)]">Sachbezug-Gutschein · {monthLabel}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(GUTSCHEIN_STYLES) as GutscheinAnbieterKey[]).map((key) => {
          const style = GUTSCHEIN_STYLES[key];
          const isSelected = selected === key;
          return (
            <form action={formAction} key={key}>
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="anbieter" value={key} />
              <button
                type="submit"
                disabled={pending}
                className={`flex w-full items-center justify-between rounded-[var(--pros-r-md)] px-4 py-4 text-left shadow-[var(--pros-shadow)] transition-[transform,box-shadow] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:shadow-[var(--pros-shadow-hover)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0 disabled:active:scale-100 ${
                  isSelected ? "ring-[3px] ring-offset-2 ring-offset-[var(--color-surface)]" : ""
                }`}
                style={{ background: style.bg, color: style.text, ...(isSelected ? { boxShadow: `0 0 0 3px ${style.bg}` } : {}) }}
              >
                <span>
                  <span className="block text-sm font-bold">{style.label}</span>
                  <span className="block text-xs" style={{ color: style.subtitle }}>
                    {style.sparte}
                  </span>
                  {isSelected && <span className="sr-only">Ausgewählt</span>}
                </span>
                {isSelected ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">Unabhängig von deiner Quote – gilt für jeden Monat.</p>
      {state?.error && (
        <p role="alert" className={`mt-2 ${errorTextCls}`}>
          {state.error}
        </p>
      )}
    </div>
  );
}
