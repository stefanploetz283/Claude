"use client";

import { useEffect } from "react";

// Gemeinsame Modal-/Dialog-Hülle für Kalender und Dokumentation (Diktat-Overlay, Warteschlange) -
// vorher hatte jede Stelle ihre eigene fixed-inset-0-Fläche mit eigenen Radius-/Shadow-Werten.
// Reine Präsentationskomponente: Öffnen/Schließen/Inhalt bleiben beim Aufrufer.

export function ProsModal({
  title,
  onClose,
  children,
  maxWidthCls = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthCls?: string;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="pros-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(11, 61, 70, 0.45)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`pros-modal-panel w-full ${maxWidthCls} max-h-[90vh] overflow-y-auto rounded-[var(--pros-r-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--pros-shadow-popover)]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--pros-sage-pale)] hover:text-[var(--color-text)]"
            aria-label="Schließen"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
