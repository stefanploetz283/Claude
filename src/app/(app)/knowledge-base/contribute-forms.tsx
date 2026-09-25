"use client";

import { useActionState, useRef, useState } from "react";
import { createKnowledgeFile, createKnowledgeLink } from "./actions";
import { cardCls, inputCls, labelCls, buttonPrimaryCls, errorTextCls, tabBarCls, tabBaseCls, tabActiveCls, tabIdleCls } from "@/app/(app)/cases/case-ui";

const fieldCls = `w-full ${inputCls}`;
// Datei-Auswahl im Eingabefeld-Look: der native "Durchsuchen"-Button bekommt die Salbei-Sekundärfläche.
const fileCls = `w-full ${inputCls} file:mr-3 file:rounded-[var(--pros-r-sm)] file:border-0 file:bg-[var(--pros-sage-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-primary)]`;

export function ContributeForms() {
  const [tab, setTab] = useState<"file" | "link">("file");
  const [fileState, fileAction, filePending] = useActionState(createKnowledgeFile, undefined);
  const [linkState, linkAction, linkPending] = useActionState(createKnowledgeLink, undefined);
  const fileFormRef = useRef<HTMLFormElement>(null);
  const linkFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className={cardCls}>
      <div role="tablist" aria-label="Inhaltstyp" className={`mb-4 ${tabBarCls}`}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "file"}
          onClick={() => setTab("file")}
          className={`${tabBaseCls} ${tab === "file" ? tabActiveCls : tabIdleCls}`}
        >
          Dokument/Bild
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "link"}
          onClick={() => setTab("link")}
          className={`${tabBaseCls} ${tab === "link" ? tabActiveCls : tabIdleCls}`}
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
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Field label="Titel">
            <input name="title" required className={fieldCls} />
          </Field>
          <Field label="Datei (PDF, Word, Bild)">
            <input name="file" type="file" required className={fileCls} />
          </Field>
          <Field label="Ordner (optional)">
            <input name="folder" placeholder="z.B. Erziehungsbeistandschaft" className={fieldCls} />
          </Field>
          <Field label="Schlagworte (Komma-getrennt)">
            <input name="tags" className={fieldCls} />
          </Field>
          <Field label="Beschreibung (optional)" wide>
            <input name="description" className={fieldCls} />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-3">
            <button type="submit" disabled={filePending} className={buttonPrimaryCls}>
              {filePending ? "Wird hochgeladen…" : "Hinzufügen"}
            </button>
            {fileState?.error && (
              <p role="alert" className={errorTextCls}>
                {fileState.error}
              </p>
            )}
          </div>
        </form>
      ) : (
        <form
          ref={linkFormRef}
          action={async (fd) => {
            await linkAction(fd);
            linkFormRef.current?.reset();
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Field label="Titel">
            <input name="title" required className={fieldCls} />
          </Field>
          <Field label="Link (URL)">
            <input name="url" type="url" required placeholder="https://…" className={fieldCls} />
          </Field>
          <Field label="Ordner (optional)">
            <input name="folder" className={fieldCls} />
          </Field>
          <Field label="Schlagworte (Komma-getrennt)">
            <input name="tags" className={fieldCls} />
          </Field>
          <Field label="Beschreibung (optional)" wide>
            <input name="description" className={fieldCls} />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-3">
            <button type="submit" disabled={linkPending} className={buttonPrimaryCls}>
              {linkPending ? "Wird gespeichert…" : "Hinzufügen"}
            </button>
            {linkState?.error && (
              <p role="alert" className={errorTextCls}>
                {linkState.error}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2 xl:col-span-2" : ""}`}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
