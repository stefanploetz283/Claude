"use client";

import { useActionState, useState, useTransition } from "react";
import { addReferenzbericht, setReferenzberichtFreigegeben, deleteReferenzbericht, updateBerichtReferenzberichteMaxAnzahl, type ActionState } from "./actions";

type Referenzbericht = { id: string; titel: string; text: string; freigegeben: boolean; erstelltVonName: string; createdAt: string };

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

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
        <p className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] px-3.5 py-2.5 text-sm text-[var(--color-warn-text)]">
          {freigegebeneAnzahl} Referenzberichte sind freigegeben, bei der Generierung werden aber nur die {maxAnzahl} zuletzt freigegebenen
          verwendet - ältere ggf. archivieren (Freigabe entziehen).
        </p>
      )}

      <div className="flex flex-col gap-3">
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
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          Maximal gleichzeitig genutzte Referenzberichte (die zuletzt freigegebenen)
        </span>
        <input name="berichtReferenzberichteMaxAnzahl" type="number" min="1" step="1" defaultValue={maxAnzahl} className={`w-24 ${inputCls}`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state?.error && <p className="w-full text-sm text-[var(--color-coral)]">{state.error}</p>}
    </form>
  );
}

function ReferenzberichtRow({ bericht }: { bericht: Referenzbericht }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-[var(--color-text)]">{bericht.titel}</span>
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            {new Date(bericht.createdAt).toLocaleDateString("de-DE")} · {bericht.erstelltVonName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              bericht.freigegeben ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            {bericht.freigegeben ? "Freigegeben" : "Nicht freigegeben"}
          </span>
          <button
            disabled={pending}
            onClick={() => startTransition(() => setReferenzberichtFreigegeben(bericht.id, !bericht.freigegeben))}
            className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            {bericht.freigegeben ? "Freigabe entziehen" : "Freigeben"}
          </button>
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-text-muted)] hover:underline">
            {open ? "Text ausblenden" : "Text anzeigen"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Referenzbericht „${bericht.titel}" wirklich löschen?`)) return;
              startTransition(() => deleteReferenzbericht(bericht.id));
            }}
            className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
          >
            Löschen
          </button>
        </div>
      </div>
      {open && <p className="mt-3 text-sm whitespace-pre-wrap text-[var(--color-text)]">{bericht.text}</p>}
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Titel</span>
        <input
          name="titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z.B. Abschlussbericht Familie M., 2025"
          className={`max-w-md ${inputCls}`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Text (Original einfügen)</span>
        <textarea name="originaltext" required rows={8} value={originaltext} onChange={(e) => setOriginaltext(e.target.value)} className={inputCls} />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
          Namen vor dem Speichern ersetzen (Pseudonymisierung)
        </p>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Nur die ersetzte Fassung wird gespeichert - der oben eingefügte Originaltext bleibt nirgends erhalten.
        </p>
        <div className="flex flex-col gap-2">
          {zeilen.map((z, i) => (
            <div key={z.id} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Name im Text</span>
                <input
                  name="ersetzungName"
                  value={z.name}
                  onChange={(e) => setZeilen((prev) => prev.map((p) => (p.id === z.id ? { ...p, name: e.target.value } : p)))}
                  placeholder="z.B. Max Mustermann"
                  className={`w-48 ${inputCls}`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">Platzhalter (optional)</span>
                <input
                  name="ersetzungPlatzhalter"
                  value={z.platzhalter}
                  onChange={(e) => setZeilen((prev) => prev.map((p) => (p.id === z.id ? { ...p, platzhalter: e.target.value } : p)))}
                  placeholder={`[Person ${i + 1}]`}
                  className={`w-40 ${inputCls}`}
                />
              </label>
              {zeilen.length > 1 && (
                <button
                  type="button"
                  onClick={() => setZeilen((prev) => prev.filter((p) => p.id !== z.id))}
                  className="text-xs font-medium text-[var(--color-coral)] hover:underline"
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setZeilen((prev) => [...prev, { id: nextId++, name: "", platzhalter: "" }])}
          className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
        >
          + Weiteren Namen ersetzen
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Referenzbericht speichern"}
      </button>
      {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
    </form>
  );
}
