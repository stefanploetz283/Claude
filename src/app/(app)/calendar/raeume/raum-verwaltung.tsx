"use client";

import { useActionState, useState, useTransition } from "react";
import { createRaum, updateRaum, toggleRaumAktiv, type RaumActionState } from "./raum-actions";
import { STANDORT_LABEL } from "@/lib/termine/labels";
import { theadCls, cardCls } from "@/app/(app)/cases/case-ui";

const inputCls =
  "rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

type Raum = { id: string; name: string; standort: string | null; aktiv: boolean };

export function RaumVerwaltung({ raeume }: { raeume: Raum[] }) {
  const [createState, createAction, createPending] = useActionState<RaumActionState, FormData>(createRaum, undefined);
  const [editing, setEditing] = useState<Raum | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neuer Raum</h2>
        <form action={createAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Name</span>
            <input name="name" required placeholder="z.B. Raum 1" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Standort</span>
            <select name="standort" className={inputCls}>
              <option value="">Kein Standort</option>
              <option value="NITTENDORF">Nittendorf</option>
              <option value="REGENSBURG">Regensburg</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--pros-shadow)] transition-[transform,background-color] duration-[170ms] ease-[var(--pros-ease)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
          >
            Anlegen
          </button>
          {createState?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{createState.error}</p>}
        </form>
      </div>

      <div className="overflow-x-auto rounded-[var(--pros-r-md)] border border-[var(--pros-border-strong)] bg-[var(--color-surface)] shadow-[var(--pros-shadow)]">
        <table className="w-full text-left text-sm">
          <thead className={theadCls}>
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Standort</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {raeume.map((r) => (
              <RaumZeile key={r.id} raum={r} editing={editing?.id === r.id} onEdit={() => setEditing(r)} onDoneEdit={() => setEditing(null)} />
            ))}
            {raeume.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  Noch keine Räume angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RaumZeile({ raum, editing, onEdit, onDoneEdit }: { raum: Raum; editing: boolean; onEdit: () => void; onDoneEdit: () => void }) {
  const [updateState, updateAction, updatePending] = useActionState<RaumActionState, FormData>(updateRaum, undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <tr className="border-t border-[var(--pros-border-default)] bg-[var(--pros-sage-pale)]/40">
        <td colSpan={4} className="px-4 py-3">
          <form
            action={(fd) => {
              updateAction(fd);
              onDoneEdit();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={raum.id} />
            <input name="name" defaultValue={raum.name} required className={inputCls} />
            <select name="standort" defaultValue={raum.standort ?? ""} className={inputCls}>
              <option value="">Kein Standort</option>
              <option value="NITTENDORF">Nittendorf</option>
              <option value="REGENSBURG">Regensburg</option>
            </select>
            <button
              type="submit"
              disabled={updatePending}
              className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-transform duration-[170ms] ease-[var(--pros-ease)] active:scale-[0.97]"
            >
              Speichern
            </button>
            <button type="button" onClick={onDoneEdit} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
              Abbrechen
            </button>
            {updateState?.error && <p className="w-full text-sm text-[var(--pros-status-critical-text)]">{updateState.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t border-[var(--pros-border-default)] transition-colors hover:bg-[var(--pros-sage-pale)]/40 ${!raum.aktiv ? "opacity-50" : ""}`}>
      <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{raum.name}</td>
      <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{raum.standort ? STANDORT_LABEL[raum.standort] : "–"}</td>
      <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{raum.aktiv ? "Aktiv" : "Deaktiviert"}</td>
      <td className="px-4 py-2.5 text-right">
        <button onClick={onEdit} className="mr-3 text-xs font-medium text-[var(--color-primary)] hover:underline">
          Bearbeiten
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => toggleRaumAktiv(raum.id, !raum.aktiv))}
          className="text-xs font-medium text-[var(--color-text-muted)] hover:underline disabled:opacity-50"
        >
          {raum.aktiv ? "Deaktivieren" : "Aktivieren"}
        </button>
      </td>
    </tr>
  );
}
