"use client";

import { useActionState, useRef, useState } from "react";
import { createKnowledgeFile, createKnowledgeLink } from "./actions";

const inputCls = "rounded-md border border-black/15 px-3 py-1.5 text-sm";

export function ContributeForms() {
  const [tab, setTab] = useState<"file" | "link">("file");
  const [fileState, fileAction, filePending] = useActionState(createKnowledgeFile, undefined);
  const [linkState, linkAction, linkPending] = useActionState(createKnowledgeLink, undefined);
  const fileFormRef = useRef<HTMLFormElement>(null);
  const linkFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="mb-3 flex gap-1 text-sm">
        <button
          onClick={() => setTab("file")}
          className={`rounded-md px-3 py-1 ${tab === "file" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}
        >
          Dokument/Bild
        </button>
        <button
          onClick={() => setTab("link")}
          className={`rounded-md px-3 py-1 ${tab === "link" ? "bg-[var(--color-primary)] text-white" : "border border-black/15"}`}
        >
          Link
        </button>
      </div>

      {tab === "file" ? (
        <form
          ref={fileFormRef}
          action={async (fd) => {
            await fileAction(fd);
            fileFormRef.current?.reset();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="Titel">
            <input name="title" required className={inputCls} />
          </Field>
          <Field label="Datei (PDF, Word, Bild)">
            <input name="file" type="file" required className="text-sm" />
          </Field>
          <Field label="Ordner (optional)">
            <input name="folder" placeholder="z.B. Erziehungsbeistandschaft" className={inputCls} />
          </Field>
          <Field label="Schlagworte (Komma-getrennt)">
            <input name="tags" className={inputCls} />
          </Field>
          <Field label="Beschreibung (optional)" grow>
            <input name="description" className={inputCls} />
          </Field>
          <button type="submit" disabled={filePending} className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {filePending ? "Wird hochgeladen…" : "Hinzufügen"}
          </button>
          {fileState?.error && <p className="w-full text-sm text-red-600">{fileState.error}</p>}
        </form>
      ) : (
        <form
          ref={linkFormRef}
          action={async (fd) => {
            await linkAction(fd);
            linkFormRef.current?.reset();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="Titel">
            <input name="title" required className={inputCls} />
          </Field>
          <Field label="Link (URL)">
            <input name="url" type="url" required placeholder="https://…" className={inputCls} />
          </Field>
          <Field label="Ordner (optional)">
            <input name="folder" className={inputCls} />
          </Field>
          <Field label="Schlagworte (Komma-getrennt)">
            <input name="tags" className={inputCls} />
          </Field>
          <Field label="Beschreibung (optional)" grow>
            <input name="description" className={inputCls} />
          </Field>
          <button type="submit" disabled={linkPending} className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {linkPending ? "Wird gespeichert…" : "Hinzufügen"}
          </button>
          {linkState?.error && <p className="w-full text-sm text-red-600">{linkState.error}</p>}
        </form>
      )}
    </div>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${grow ? "min-w-[14rem] flex-1" : ""}`}>
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}
