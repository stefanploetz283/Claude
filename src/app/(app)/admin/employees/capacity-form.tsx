"use client";

import { useActionState, useState } from "react";
import { updateEmployeeCapacity, type ActionState } from "./actions";

export function CapacityForm({
  userId,
  weeklyContractHours,
  allowedHelpTypeIds,
  helpTypes,
}: {
  userId: string;
  weeklyContractHours: string | null;
  allowedHelpTypeIds: string[];
  helpTypes: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateEmployeeCapacity, undefined);

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
        {open ? "Kapazität ausblenden" : "Kapazität/Hilfearten bearbeiten"}
      </button>
      {open && (
        <form action={formAction} className="mt-2 flex flex-col gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <input type="hidden" name="userId" value={userId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Vertragsstunden/Woche</span>
            <input
              name="weeklyContractHours"
              type="number"
              min="0"
              step="0.5"
              defaultValue={weeklyContractHours ?? ""}
              className="w-28 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)]"
            />
          </label>
          <div>
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Darf folgende Hilfearten bearbeiten</span>
            <div className="mt-1.5 flex flex-col gap-1">
              {helpTypes.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input type="checkbox" name="allowedHelpTypeIds" value={h.id} defaultChecked={allowedHelpTypeIds.includes(h.id)} />
                  {h.name}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {pending ? "Speichern…" : "Speichern"}
          </button>
          {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
          {state?.success && <p className="text-sm text-[var(--color-green-medium)]">{state.success}</p>}
        </form>
      )}
    </div>
  );
}
