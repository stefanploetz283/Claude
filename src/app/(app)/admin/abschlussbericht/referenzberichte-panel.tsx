"use client";

import { useActionState, useState, useTransition } from "react";
import { addReferenzbericht, setReferenzberichtFreigegeben, deleteReferenzbericht, updateBerichtReferenzberichteMaxAnzahl, type ActionState } from "./actions";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { IconPlus } from "@/components/pros/pros-icons";
import { IconWarnTriangle } from "@/app/(app)/cases/case-icons";
import {
  inputCls,
  labelCls,
  noticeWarnCls,
  buttonPrimaryCls,
  buttonSmOutlineCls,
  errorTextCls,
  linkActionCls,
  linkMutedCls,
  linkDangerCls,
} from "@/app/(app)/cases/case-ui";

type Referenzbericht = { id: string; titel: string; text: string; freigegeben: boolean; erstelltVonName: string; createdAt: string };

export function ReferenzberichtePanel({
  berichte,
  freigegebeneAnzahl,
  maxAnzahl,
}: {
  berichte: Referenzbericht[];
  freigegebeneAnzahl: number;
  maxAnzahl: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <MaxAnzahlForm maxAnzahl={maxAnzahl} />

      {freigegebeneAnzahl > maxAnzahl && (
        <p className={`${noticeWarnCls} flex items-start gap-2.5 text-sm text-[var(--color-text)]`}>
          <IconWarnTriangle className="mt-0.5 shrink-0 text-[var(--pros-status-attention-text)]" />
          <span>
            {freigegebeneAnzahl} Referenzberichte sind freigegeben, bei der Generierung werden aber nur die {maxAnzahl} zuletzt freigegebenen
            verwendet - ältere ggf. archivieren (Freigabe entziehen).
          </span>
        </p>
      )}

      <div className="flex flex-col">
        {berichte.map((r) => (
          <ReferenzberichtRow key={r.id} bericht={r} />
        ))}
        {berichte.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Referenzberichte.</p>}
      </div>

      <AddReferenzberichtForm />
    </div>
  );
}

function MaxAnzahlForm({ maxAnzahl }: { maxAnzahl: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateBerichtReferenzberichteMaxAnzahl, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <label htmlFor="referenzberichte-max" className={labelCls}>
        Maximal gleichzeitig genutzte Referenzberichte (die zuletzt freigegebenen)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input id="referenzberichte-max" name="berichtReferenzberichteMaxAnzahl" type="number" min="1" step="1" defaultValue={maxAnzahl} className={`w-24 ${inputCls}`} />
        <button type="submit" disabled={pending} className={`${buttonSmOutlineCls} py-2.5!`}>
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className={errorTextCls}>
          {state.error}
        </p>
      )}
    </form>
  );
}

function ReferenzberichtRow({ bericht }: { bericht: Referenzbericht }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border-t border-[var(--pros-border-default)] py-3.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[var(--color-text)]">{bericht.titel}</span>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            {new Date(bericht.createdAt).toLocaleDateString("de-DE")} · {bericht.erstelltVonName}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProsStatusPill tone={bericht.freigegeben ? "active" : "archived"}>{bericht.freigegeben ? "Freigegeben" : "Nicht freigegeben"}</ProsStatusPill>
          <button
            disabled={pending}
            onClick={() => startTransition(() => setReferenzberichtFreigegeben(bericht.id, !bericht.freigegeben))}
            className={linkActionCls}
          >
            {bericht.freigegeben ? "Freigabe entziehen" : "Freigeben"}
          </button>
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={linkMutedCls}>
            {open ? "Text ausblenden" : "Text anzeigen"}
          </button>
          <button disabled={pending} onClick={() => setConfirmDelete(true)} className={linkDangerCls}>
            Löschen
          </button>
        </div>
      </div>
      {open && (
        <p className="mt-3 max-w-[75ch] rounded-[var(--pros-r-sm)] bg-[var(--pros-sage-pale)] p-4 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
          {bericht.text}
        </p>
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title="Referenzbericht löschen"
          message={`Referenzbericht „${bericht.titel}“ wirklich löschen?`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            startTransition(() => deleteReferenzbericht(bericht.id));
          }}
        />
      )}
    </div>
  );
}

type ErsetzungsZeile = { id: number; name: string; platzhalter: string };

function AddReferenzberichtForm() {
  const [titel, setTitel] = useState("");
  const [originaltext, setOriginaltext] = useState("");
  const [zeilen, setZeilen] = useState<ErsetzungsZeile[]>([{ id: 1, name: "", platzhalter: "" }]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  let nextId = zeilen.length + 1;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addReferenzbericht(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setTitel("");
      setOriginaltext("");
      setZeilen([{ id: 1, name: "", platzhalter: "" }]);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-[var(--pros-border-default)] pt-5">
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Titel</span>
        <input
          name="titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z.B. Abschlussbericht Familie M., 2025"
          className={`w-full max-w-md ${inputCls}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Text (Original einfügen)</span>
        <textarea name="originaltext" required rows={8} value={originaltext} onChange={(e) => setOriginaltext(e.target.value)} className={`w-full leading-relaxed ${inputCls}`} />
      </label>

      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">Namen vor dem Speichern ersetzen (Pseudonymisierung)</p>
        <p className="mt-0.5 mb-3 text-xs text-[var(--color-text-muted)]">
          Nur die ersetzte Fassung wird gespeichert - der oben eingefügte Originaltext bleibt nirgends erhalten.
        </p>
        <div className="flex flex-col gap-2">
          {zeilen.map((z, i) => (
            <div key={z.id} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Name im Text</span>
                <input
                  name="ersetzungName"
                  value={z.name}
                  onChange={(e) => setZeilen((prev) => prev.map((p) => (p.id === z.id ? { ...p, name: e.target.value } : p)))}
                  placeholder="z.B. Max Mustermann"
                  className={`w-full sm:w-48 ${inputCls}`}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Platzhalter (optional)</span>
                <input
                  name="ersetzungPlatzhalter"
                  value={z.platzhalter}
                  onChange={(e) => setZeilen((prev) => prev.map((p) => (p.id === z.id ? { ...p, platzhalter: e.target.value } : p)))}
                  placeholder={`[Person ${i + 1}]`}
                  className={`w-full sm:w-40 ${inputCls}`}
                />
              </label>
              {zeilen.length > 1 && (
                <button type="button" onClick={() => setZeilen((prev) => prev.filter((p) => p.id !== z.id))} className={`mb-3 ${linkDangerCls}`}>
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setZeilen((prev) => [...prev, { id: nextId++, name: "", platzhalter: "" }])}
          className={`mt-3 inline-flex items-center gap-1 ${linkActionCls}`}
        >
          <IconPlus size={14} />
          Weiteren Namen ersetzen
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonPrimaryCls}>
          {pending ? "Speichern…" : "Referenzbericht speichern"}
        </button>
        {error && (
          <p role="alert" className={errorTextCls}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
