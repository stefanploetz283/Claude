"use client";

import { useActionState } from "react";
import { saveStammdaten, type ActionState } from "../../actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function StammdatenForm({
  userId,
  address,
  birthday,
  emergencyContact,
}: {
  userId: string;
  address: string | null;
  birthday: string;
  emergencyContact: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveStammdaten, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Adresse</span>
          <input name="address" defaultValue={address ?? ""} placeholder="Straße Hausnr. · PLZ Ort" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Geburtstag</span>
          <input name="birthday" type="date" defaultValue={birthday} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Notfallkontakt</span>
          <input name="emergencyContact" defaultValue={emergencyContact ?? ""} placeholder="Name, Telefonnummer" className={inputCls} />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
      {state?.success && <p className="text-sm text-[var(--color-green-medium)]">{state.success}</p>}
    </form>
  );
}
