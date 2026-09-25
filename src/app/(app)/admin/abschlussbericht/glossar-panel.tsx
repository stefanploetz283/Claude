"use client";

import { useState, useTransition } from "react";
import { addGlossarBegriff, updateGlossarBegriff, deleteGlossarBegriff } from "./actions";
import { ConfirmDeleteModal } from "./confirm-delete-modal";
import { inputCls, labelCls, buttonSmOutlineCls, buttonSmPrimaryCls, errorTextCls, linkDangerCls } from "@/app/(app)/cases/case-ui";

type Begriff = { id: string; begriff: string; definition: string };

export function GlossarPanel({ begriffe }: { begriffe: Begriff[] }) {
  return (
    <div className="flex flex-col">
      {begriffe.map((b) => (
        <GlossarRow key={b.id} begriff={b} />
      ))}
      {begriffe.length === 0 && <p className="pb-4 text-sm text-[var(--color-text-muted)]">Noch keine Begriffe.</p>}
      <AddGlossarRow />
    </div>
  );
}

function GlossarRow({ begriff }: { begriff: Begriff }) {
  const [b, setB] = useState(begriff.begriff);
  const [d, setD] = useState(begriff.definition);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border-t border-[var(--pros-border-default)] py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Begriff</span>
          <input value={b} onChange={(e) => setB(e.target.value)} className={`w-full sm:w-48 ${inputCls}`} />
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
          <span className={labelCls}>Definition</span>
          <textarea value={d} onChange={(e) => setD(e.target.value)} rows={2} className={`w-full ${inputCls}`} />
        </label>
        <div className="flex items-center gap-3 pb-2.5">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateGlossarBegriff(begriff.id, b, d);
                setError(result?.error ?? null);
              })
            }
            className={buttonSmOutlineCls}
          >
            Speichern
          </button>
          <button disabled={pending} onClick={() => setConfirmDelete(true)} className={linkDangerCls}>
            Löschen
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className={`mt-2 ${errorTextCls}`}>
          {error}
        </p>
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title="Begriff löschen"
          message={`Begriff „${begriff.begriff}“ wirklich löschen?`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            startTransition(() => deleteGlossarBegriff(begriff.id));
          }}
        />
      )}
    </div>
  );
}

function AddGlossarRow() {
  const [b, setB] = useState("");
  const [d, setD] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-[var(--pros-border-default)] pt-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Neuer Begriff</span>
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="z.B. Kongruenz" className={`w-full sm:w-48 ${inputCls}`} />
      </label>
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
        <span className={labelCls}>Definition</span>
        <textarea value={d} onChange={(e) => setD(e.target.value)} rows={2} className={`w-full ${inputCls}`} />
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
        className={`${buttonSmPrimaryCls} mb-2.5`}
      >
        Hinzufügen
      </button>
      {error && (
        <p role="alert" className={`w-full ${errorTextCls}`}>
          {error}
        </p>
      )}
    </div>
  );
}
