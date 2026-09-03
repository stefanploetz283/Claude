"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createAusgabe, updateAusgabe, deleteAusgabe, toggleReKoRelevant, type AusgabeActionState } from "./ausgabe-actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export type KategorieOption = { id: string; name: string; jahr: number };
export type AusgabeRow = {
  id: string;
  betrag: number;
  datum: string; // YYYY-MM-DD
  beschreibung: string;
  quelle: string;
  reKoBudgetRelevant: boolean;
  kategorieId: string | null;
  kategorieName: string | null;
};

function eur(n: number) {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function KategorieSelect({ name, options, defaultValue }: { name: string; options: KategorieOption[]; defaultValue?: string | null }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputCls}>
      <option value="">— keine Position (nicht eingeplante Kosten) —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name} ({o.jahr})
        </option>
      ))}
    </select>
  );
}

export function AusgabeErfassung({ kategorien, ausgaben }: { kategorien: KategorieOption[]; ausgaben: AusgabeRow[] }) {
  const [createState, createAction, createPending] = useActionState<AusgabeActionState, FormData>(createAusgabe, undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className={cardCls}>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Ausgabe erfassen</h2>
        <form action={createAction} className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Betrag (€)</span>
              <input name="betrag" type="number" min="0.01" step="0.01" required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Datum</span>
              <input name="datum" type="date" defaultValue={heute} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 lg:col-span-2">
              <span className={labelCls}>Beschreibung</span>
              <input name="beschreibung" required className={inputCls} placeholder="z.B. Fachbuch Traumapädagogik" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelCls}>Budget-Position</span>
              <KategorieSelect name="kategorieId" options={kategorien} />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2 sm:pt-6">
              <input type="checkbox" name="reKoBudgetRelevant" defaultChecked />
              <span className="text-sm text-[var(--color-text)]">ReKo-budgetrelevant (zählt gegen das Budget)</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={createPending}
            className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {createPending ? "Speichern…" : "Ausgabe speichern"}
          </button>
          {createState?.error && <p className="text-sm text-[var(--color-coral)]">{createState.error}</p>}
          {createState?.success && <p className="text-sm text-[var(--color-primary)]">{createState.success}</p>}
        </form>
      </div>

      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Zuletzt erfasste Ausgaben</h2>
        {ausgaben.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Noch keine Ausgaben erfasst.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                <tr>
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Beschreibung</th>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3 text-right">Betrag</th>
                  <th className="py-2 pr-3">ReKo</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {ausgaben.map((a) =>
                  editId === a.id ? (
                    <tr key={a.id} className="border-t border-[var(--color-border)]">
                      <td colSpan={6} className="py-3">
                        <EditForm row={a} kategorien={kategorien} onDone={() => setEditId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">
                        {new Date(a.datum).toLocaleDateString("de-DE")}
                      </td>
                      <td className="py-2 pr-3 text-[var(--color-text)]">{a.beschreibung}</td>
                      <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">{a.kategorieName ?? "nicht eingeplant"}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-[var(--color-text)]">{eur(a.betrag)}</td>
                      <td className="py-2 pr-3">
                        <ReKoToggle id={a.id} value={a.reKoBudgetRelevant} />
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditId(a.id)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                          Bearbeiten
                        </button>
                        <span className="mx-1.5 text-[var(--color-border)]">·</span>
                        <DeleteButton id={a.id} beschreibung={a.beschreibung} />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({ row, kategorien, onDone }: { row: AusgabeRow; kategorien: KategorieOption[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<AusgabeActionState, FormData>(updateAusgabe, undefined);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={row.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Betrag (€)</span>
          <input name="betrag" type="number" min="0.01" step="0.01" defaultValue={row.betrag} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Datum</span>
          <input name="datum" type="date" defaultValue={row.datum} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className={labelCls}>Beschreibung</span>
          <input name="beschreibung" defaultValue={row.beschreibung} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={labelCls}>Budget-Position</span>
          <KategorieSelect name="kategorieId" options={kategorien} defaultValue={row.kategorieId} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2 sm:pt-6">
          <input type="checkbox" name="reKoBudgetRelevant" defaultChecked={row.reKoBudgetRelevant} />
          <span className="text-sm text-[var(--color-text)]">ReKo-budgetrelevant</span>
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

function ReKoToggle({ id, value }: { id: string; value: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => void (await toggleReKoRelevant(id, !value)))}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold disabled:opacity-50 ${
        value ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-bg)] text-[var(--color-text-muted)]"
      }`}
      title="ReKo-Budgetrelevanz umschalten"
    >
      {value ? "ja" : "nein"}
    </button>
  );
}

function DeleteButton({ id, beschreibung }: { id: string; beschreibung: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(`Ausgabe „${beschreibung}" löschen?`)) startTransition(async () => void (await deleteAusgabe(id)));
      }}
      className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
    >
      Löschen
    </button>
  );
}
