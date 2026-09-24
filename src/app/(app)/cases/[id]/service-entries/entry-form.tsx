"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createServiceEntry } from "./actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "w-full rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)]";

export function NewEntryForm({
  caseId,
  activityOptions,
  initialValues,
  redirectTo,
}: {
  caseId: string;
  /** Wochenprofil-Kategorien der Hilfeart dieses Falls, für die optionale Zuordnung. */
  activityOptions?: { id: string; label: string }[];
  /** Vorbefüllung, z.B. aus der Sprachdokumentation. Ohne diese Angabe verhält sich das Formular wie zuvor. */
  initialValues?: { date: string; startTime: string; endTime: string; description: string; activityProfileId?: string };
  /** Wohin nach erfolgreichem Speichern navigiert werden soll (z.B. aus der Sprachdokumentation heraus). */
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(createServiceEntry, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success && redirectTo) router.push(redirectTo);
  }, [state, redirectTo, router]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4 rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] p-5 shadow-[var(--pros-shadow)]"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <Field label="Datum">
        <input name="date" type="date" required defaultValue={initialValues?.date ?? toDateInputValue(new Date())} className={inputCls} />
      </Field>
      <Field label="Von">
        <input name="startTime" type="time" required defaultValue={initialValues?.startTime} className={inputCls} />
      </Field>
      <Field label="Bis">
        <input name="endTime" type="time" required defaultValue={initialValues?.endTime} className={inputCls} />
      </Field>
      <Field label="Inhaltsbeschreibung" grow>
        <input name="description" required defaultValue={initialValues?.description} placeholder="Was wurde gemacht?" className={inputCls} />
      </Field>
      {activityOptions && activityOptions.length > 0 && (
        <Field label="Kategorie (optional)">
          <select name="activityProfileId" defaultValue={initialValues?.activityProfileId ?? ""} className={inputCls}>
            <option value="">–</option>
            {activityOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
      >
        {pending ? "Speichern…" : "Eintragen"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}
    </form>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${grow ? "min-w-[16rem] flex-1" : ""}`}>
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
