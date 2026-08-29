"use client";

import { useActionState, useState } from "react";
import { saveBerichtsManualVersion, type ActionState } from "./actions";
import { MANUAL_STANDARDTEXT } from "@/lib/berichtsbausteine/manual";

type Version = { id: string; text: string; createdAt: string; erstelltVonName: string };

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function BerichtsManualPanel({ helpTypeId, versionen }: { helpTypeId: string; versionen: Version[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBerichtsManualVersion, undefined);
  const aktuelle = versionen[0] ?? null;

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
        {open ? "Berichtsmanual ausblenden" : "Berichtsmanual bearbeiten"}
      </button>
      {open && (
        <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            {aktuelle
              ? `Aktuelle Version vom ${new Date(aktuelle.createdAt).toLocaleDateString("de-DE")} (${aktuelle.erstelltVonName}). Speichern legt eine neue Version an - bestehende Versionen bleiben unverändert, damit bereits generierte Berichte nachvollziehbar bleiben.`
              : "Noch keine Version gespeichert - der Text unten ist ein Vorschlag auf Basis der Manual-Struktur und kann vor dem Speichern angepasst werden."}
          </p>
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="helpTypeId" value={helpTypeId} />
            <textarea name="text" defaultValue={aktuelle?.text ?? MANUAL_STANDARDTEXT} rows={16} className={`${inputCls} font-mono text-xs`} />
            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Als neue Version speichern"}
            </button>
            {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
          </form>

          {versionen.length > 1 && (
            <div className="mt-4 border-t border-[var(--color-border)] pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Frühere Versionen</p>
              <ul className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                {versionen.slice(1).map((v) => (
                  <li key={v.id}>
                    {new Date(v.createdAt).toLocaleString("de-DE")} - {v.erstelltVonName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
