"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createKategorie, updateKategorie, deleteKategorie, type KategorieActionState } from "./kategorie-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export type KategorieRow = {
  id: string;
  name: string;
  jahr: number;
  jahresbudget: number;
  quelle: string;
  stichwoerter: string[];
  anzahlAusgaben: number;
};

function eur(n: number) {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

export function KategorieVerwaltung({ jahr, kategorien }: { jahr: number; kategorien: KategorieRow[] }) {
  const [createState, createAction, createPending] = useActionState<KategorieActionState, FormData>(createKategorie, undefined);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className={cardCls}>
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Budget-Positionen {jahr}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Manuell pflegbar – unabhängig vom Excel-Import. Stichwörter helfen dem Finom-CSV-Import bei der automatischen Zuordnung.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
            <tr>
              <th className="py-2 pr-3">Position</th>
              <th className="py-2 pr-3 text-right">Jahresbudget</th>
              <th className="py-2 pr-3">Stichwörter</th>
              <th className="py-2 pr-3">Herkunft</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {kategorien.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-[var(--color-text-muted)]">
                  Noch keine Positionen für {jahr}.
                </td>
              </tr>
            )}
            {kategorien.map((k) =>
              editId === k.id ? (
                <tr key={k.id} className="border-t border-[var(--color-border)] align-top">
                  <td colSpan={5} className="py-3">
                    <EditForm row={k} onDone={() => setEditId(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={k.id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 pr-3 text-[var(--color-text)]">{k.name}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-[var(--color-text)]">{eur(k.jahresbudget)}</td>
                  <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">{k.stichwoerter.join(", ") || "–"}</td>
                  <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">
                    {k.quelle === "excel_import" ? "Entgeltkalkulation" : "manuell"}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditId(k.id)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                      Bearbeiten
                    </button>
                    <span className="mx-1.5 text-[var(--color-border)]">·</span>
                    <DeleteButton id={k.id} name={k.name} anzahlAusgaben={k.anzahlAusgaben} />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Neue Position */}
      <form action={createAction} className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Neue Position anlegen</p>
        <input type="hidden" name="jahr" value={jahr} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className={labelCls}>Name</span>
            <input name="name" required className={inputCls} placeholder="z.B. Fortbildung / Supervision" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Jahresbudget (€)</span>
            <input name="jahresbudget" type="number" min="0" step="0.01" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Stichwörter (Komma-getrennt, optional)</span>
            <input name="stichwoerter" className={inputCls} placeholder="amazon, bücher" />
          </label>
        </div>
        <button
          type="submit"
          disabled={createPending}
          className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {createPending ? "Speichern…" : "Position anlegen"}
        </button>
        {createState?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{createState.error}</p>}
        {createState?.success && <p className="mt-2 text-sm text-[var(--color-primary)]">{createState.success}</p>}
      </form>
    </div>
  );
}

function EditForm({ row, onDone }: { row: KategorieRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<KategorieActionState, FormData>(updateKategorie, undefined);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={row.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className={labelCls}>Name</span>
          <input name="name" defaultValue={row.name} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Jahresbudget (€)</span>
          <input name="jahresbudget" type="number" min="0" step="0.01" defaultValue={row.jahresbudget} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Stichwörter</span>
          <input name="stichwoerter" defaultValue={row.stichwoerter.join(", ")} className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
        <button type="button" onClick={onDone} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
          Abbrechen
        </button>
      </div>
      {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}

function DeleteButton({ id, name, anzahlAusgaben }: { id: string; name: string; anzahlAusgaben: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        const hinweis =
          anzahlAusgaben > 0
            ? `Position „${name}" löschen? ${anzahlAusgaben} zugeordnete Ausgabe(n) bleiben erhalten und zählen dann als nicht eingeplante Kosten.`
            : `Position „${name}" löschen?`;
        if (confirm(hinweis)) startTransition(async () => void (await deleteKategorie(id)));
      }}
      className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
