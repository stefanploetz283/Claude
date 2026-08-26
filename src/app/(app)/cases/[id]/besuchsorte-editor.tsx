"use client";

import { useActionState, useState, useTransition } from "react";
import { addBesuchsort, updateBesuchsort, deleteBesuchsort, updateCaseGeplanteFlsStdWoche } from "../actions";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const saveBtnCls =
  "rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50";
const deleteBtnCls = "text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50";
const BEZEICHNUNG_VORSCHLAEGE_ID = "besuchsort-bezeichnung-vorschlaege";

type Besuchsort = { id: string; bezeichnung: string; adresse: string; besucheProMonat: number };

export function BesuchsorteEditor({
  caseId,
  besuchsorte,
  geplanteFlsStdWoche,
}: {
  caseId: string;
  besuchsorte: Besuchsort[];
  geplanteFlsStdWoche: number | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <datalist id={BEZEICHNUNG_VORSCHLAEGE_ID}>
        <option value="Zuhause" />
        <option value="Schule" />
        <option value="Sonstiges" />
      </datalist>

      <div className="flex flex-col gap-2">
        {besuchsorte.map((b) => (
          <BesuchsortRow key={b.id} besuchsort={b} caseId={caseId} canDelete={besuchsorte.length > 1} />
        ))}
        {besuchsorte.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Besuchsorte.</p>}
      </div>

      <AddBesuchsortForm caseId={caseId} />

      <div className="border-t border-[var(--color-border)] pt-4">
        <GeplanteFlsStdWocheForm caseId={caseId} geplanteFlsStdWoche={geplanteFlsStdWoche} />
      </div>
    </div>
  );
}

function BesuchsortRow({ besuchsort, caseId, canDelete }: { besuchsort: Besuchsort; caseId: string; canDelete: boolean }) {
  const [bezeichnung, setBezeichnung] = useState(besuchsort.bezeichnung);
  const [adresse, setAdresse] = useState(besuchsort.adresse);
  const [besucheProMonat, setBesucheProMonat] = useState(String(besuchsort.besucheProMonat));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bezeichnung</span>
        <input
          list={BEZEICHNUNG_VORSCHLAEGE_ID}
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          className={`w-32 ${inputCls}`}
        />
      </label>
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Adresse</span>
        <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Besuche/Monat</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value={besucheProMonat}
          onChange={(e) => setBesucheProMonat(e.target.value)}
          className={`w-24 ${inputCls}`}
        />
      </label>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateBesuchsort(besuchsort.id, caseId, bezeichnung, adresse, besucheProMonat);
            setError(result?.error ?? null);
          })
        }
        className={saveBtnCls}
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      <button
        disabled={pending || !canDelete}
        title={canDelete ? undefined : "Ein Fall benötigt mindestens einen Besuchsort."}
        onClick={() => {
          if (!confirm(`Besuchsort „${besuchsort.bezeichnung}" wirklich löschen?`)) return;
          startTransition(async () => {
            const result = await deleteBesuchsort(besuchsort.id, caseId);
            setError(result?.error ?? null);
          });
        }}
        className={deleteBtnCls}
      >
        Löschen
      </button>
      {error && <p className="w-full text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}

function AddBesuchsortForm({ caseId }: { caseId: string }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [adresse, setAdresse] = useState("");
  const [besucheProMonat, setBesucheProMonat] = useState("4.33");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bezeichnung</span>
        <input
          list={BEZEICHNUNG_VORSCHLAEGE_ID}
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          placeholder="z.B. Schule"
          className={`w-32 ${inputCls}`}
        />
      </label>
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Adresse</span>
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Straße Hausnr., PLZ Ort"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Besuche/Monat</span>
        <input
          type="number"
          min="0"
          step="0.5"
          value={besucheProMonat}
          onChange={(e) => setBesucheProMonat(e.target.value)}
          className={`w-24 ${inputCls}`}
        />
      </label>
      <button
        disabled={pending || !bezeichnung.trim() || !adresse.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await addBesuchsort(caseId, bezeichnung, adresse, besucheProMonat);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setError(null);
            setBezeichnung("");
            setAdresse("");
            setBesucheProMonat("4.33");
          })
        }
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Wird hinzugefügt…" : "Weiteren Besuchsort hinzufügen"}
      </button>
      {error && <p className="w-full text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}

function GeplanteFlsStdWocheForm({ caseId, geplanteFlsStdWoche }: { caseId: string; geplanteFlsStdWoche: number | null }) {
  const [state, formAction, pending] = useActionState(updateCaseGeplanteFlsStdWoche, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Geplante FLS-Std./Woche</span>
        <input
          name="geplanteFlsStdWoche"
          type="number"
          min="0"
          step="0.5"
          defaultValue={geplanteFlsStdWoche ?? ""}
          className={`w-36 ${inputCls}`}
        />
      </label>
      <button type="submit" disabled={pending} className={saveBtnCls}>
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}
