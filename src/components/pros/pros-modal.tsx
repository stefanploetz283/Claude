"use client";

import { useEffect, useRef, useState } from "react";

// Gemeinsame Modal-/Dialog-Hülle für Kalender und Dokumentation (Diktat-Overlay, Warteschlange) -
// vorher hatte jede Stelle ihre eigene fixed-inset-0-Fläche mit eigenen Radius-/Shadow-Werten.
// Reine Präsentationskomponente: Öffnen/Schließen/Inhalt bleiben beim Aufrufer.
//
// Fokusverwaltung (WCAG 2.4.3 / ARIA-Dialog-Muster): beim Öffnen wandert der Fokus in den Dialog (ein bereits
// per autoFocus fokussiertes Element bleibt, sonst das erste Inhaltselement, sonst der Schließen-Button),
// Tab/Shift+Tab bleiben im Dialog, Escape schließt, und beim Schließen geht der Fokus zurück zum Element,
// das den Dialog ausgelöst hat.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  // Der auslösende Fokus wird schon beim ersten Render festgehalten - danach kann ein autoFocus-Element im
  // Dialog den Fokus bereits übernommen haben, bevor Effekte laufen.
  const [trigger] = useState<HTMLElement | null>(() => (typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusablesIn(panelRef.current);
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && !!panelRef.current?.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Nur beim Öffnen/Schließen (nicht bei jedem Render des Aufrufers): Fokus hinein und zurück.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const items = focusablesIn(panel);
      const target = items.find((el) => !el.hasAttribute("data-modal-close")) ?? items[0] ?? panel;
      target.focus();
    }
    return () => {
      if (trigger && trigger !== document.body && document.contains(trigger)) trigger.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pros-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(11, 61, 70, 0.45)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`pros-modal-panel w-full ${maxWidthCls} max-h-[90vh] overflow-y-auto outline-none rounded-[var(--pros-r-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--pros-shadow-popover)]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            data-modal-close=""
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
