"use client";

import { useActionState } from "react";
import { selectGutschein, type ActionState } from "./actions";
import { GUTSCHEIN_STYLES, type GutscheinAnbieterKey } from "./bonus-colors";

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
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Sachbezug-Gutschein · {monthLabel}</h2>
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
                className={`flex w-full items-center justify-between rounded-[var(--radius-card)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition disabled:opacity-60 ${
                  isSelected ? "ring-[3px] ring-offset-2 ring-offset-[var(--color-bg)]" : ""
                }`}
                style={{ background: style.bg, color: style.text, ...(isSelected ? { boxShadow: `0 0 0 3px ${style.bg}` } : {}) }}
              >
                <span>
                  <span className="block text-sm font-bold">{style.label}</span>
                  <span className="block text-xs" style={{ color: style.subtitle }}>
                    {style.sparte}
                  </span>
                </span>
                {isSelected ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Unabhängig von deiner Quote – gilt für jeden Monat.</p>
      {state?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{state.error}</p>}
    </div>
  );
}
