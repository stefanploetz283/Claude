"use client";

import { useActionState, useState } from "react";
import { saveBerichtsManualVersion, type ActionState } from "./actions";
import { MANUAL_STANDARDTEXT } from "@/lib/berichtsbausteine/manual";
import { IconChevronDown } from "@/components/pros/pros-icons";
import { filterFieldCls, buttonPrimaryCls, errorTextCls, linkActionCls } from "@/app/(app)/cases/case-ui";

type Version = { id: string; text: string; createdAt: string; erstelltVonName: string };

export function BerichtsManualPanel({ helpTypeId, versionen }: { helpTypeId: string; versionen: Version[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBerichtsManualVersion, undefined);
  const aktuelle = versionen[0] ?? null;

  return (
    <div className="w-full">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`inline-flex items-center gap-1 ${linkActionCls}`}>
        <IconChevronDown size={14} className={`transition-transform duration-[170ms] motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        {open ? "Berichtsmanual ausblenden" : "Berichtsmanual bearbeiten"}
      </button>
      {open && (
        <div className="mt-3 min-w-[18rem] rounded-[var(--pros-r-sm)] border border-[var(--pros-border-default)] bg-[var(--pros-sage-pale)]/60 p-4">
          <p className="mb-3 max-w-[70ch] text-xs leading-relaxed text-[var(--color-text-muted)]">
            {aktuelle
              ? `Aktuelle Version vom ${new Date(aktuelle.createdAt).toLocaleDateString("de-DE")} (${aktuelle.erstelltVonName}). Speichern legt eine neue Version an - bestehende Versionen bleiben unverändert, damit bereits generierte Berichte nachvollziehbar bleiben.`
              : "Noch keine Version gespeichert - der Text unten ist ein Vorschlag auf Basis der Manual-Struktur und kann vor dem Speichern angepasst werden."}
          </p>
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="helpTypeId" value={helpTypeId} />
            <textarea
              name="text"
              aria-label="Berichtsmanual-Text"
              defaultValue={aktuelle?.text ?? MANUAL_STANDARDTEXT}
              rows={16}
              className={`w-full text-[13px] leading-relaxed ${filterFieldCls}`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className={buttonPrimaryCls}>
                {pending ? "Speichern…" : "Als neue Version speichern"}
              </button>
              {state?.error && (
                <p role="alert" className={errorTextCls}>
                  {state.error}
                </p>
              )}
            </div>
          </form>

          {versionen.length > 1 && (
            <div className="mt-4 border-t border-[var(--pros-border-default)] pt-3">
              <p className="mb-2 text-xs font-semibold text-[var(--color-text)]">Frühere Versionen</p>
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
