"use client";

import { ProsModal } from "@/components/pros/pros-modal";
import { buttonSecondaryCls, buttonDangerSolidCls } from "@/app/(app)/cases/case-ui";

// Ersetzt die nativen confirm()-Abfragen im Abschlussbericht-Modul (Glossar, Referenzberichte) durch die
// gemeinsame PROS-Modal-Hülle. Gleiche Frage, gleiche Aktion - nur die Darstellung ändert sich. Der Fokus
// startet auf "Abbrechen", damit ein versehentliches Enter nichts löscht.
export function ConfirmDeleteModal({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ProsModal title={title} onClose={onCancel} maxWidthCls="max-w-md">
      <p className="text-sm leading-relaxed text-[var(--color-text)]">{message}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <button type="button" autoFocus onClick={onCancel} className={buttonSecondaryCls}>
          Abbrechen
        </button>
        <button type="button" onClick={onConfirm} className={buttonDangerSolidCls}>
          Löschen
        </button>
      </div>
    </ProsModal>
  );
}
