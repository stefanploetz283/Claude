"use client";

import { useState, useTransition } from "react";
import { addGlossarBegriff, updateGlossarBegriff, deleteGlossarBegriff } from "./actions";

type Begriff = { id: string; begriff: string; definition: string };

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function GlossarPanel({ begriffe }: { begriffe: Begriff[] }) {
  return (
    <div className="flex flex-col gap-3">
      {begriffe.map((b) => (
        <GlossarRow key={b.id} begriff={b} />
      ))}
      {begriffe.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Begriffe.</p>}
      <AddGlossarRow />
    </div>
  );
}

function GlossarRow({ begriff }: { begriff: Begriff }) {
  const [b, setB] = useState(begriff.begriff);
  const [d, setD] = useState(begriff.definition);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Begriff</span>
          <input value={b} onChange={(e) => setB(e.target.value)} className={`w-48 ${inputCls}`} />
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Definition</span>
          <textarea value={d} onChange={(e) => setD(e.target.value)} rows={2} className={inputCls} />
        </label>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateGlossarBegriff(begriff.id, b, d);
              setError(result?.error ?? null);
            })
          }
          className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
        >
          Speichern
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Begriff „${begriff.begriff}" wirklich löschen?`)) return;
            startTransition(() => deleteGlossarBegriff(begriff.id));
          }}
          className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
        >
          Löschen
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}

function AddGlossarRow() {
  const [b, setB] = useState("");
  const [d, setD] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Neuer Begriff</span>
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="z.B. Kongruenz" className={`w-48 ${inputCls}`} />
      </label>
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Definition</span>
        <textarea value={d} onChange={(e) => setD(e.target.value)} rows={2} className={inputCls} />
      </label>
      <button
        disabled={pending || !b.trim() || !d.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await addGlossarBegriff(b, d);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setError(null);
            setB("");
            setD("");
          })
        }
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Hinzufügen
      </button>
      {error && <p className="w-full text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}
