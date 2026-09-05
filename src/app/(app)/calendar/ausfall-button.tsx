"use client";

import { useTransition } from "react";
import { terminAlsAusgefallenMarkieren } from "./buchung-actions";

/** Kompakte Variante ohne Notiz-Dialog für Tabellenzeilen (z.B. Fallakte) - für den vollen Kalender mit
 * Notizfeld siehe AusfallDialog. Termin wird nie gelöscht, nur als ausgefallen markiert (Historie bleibt). */
export function AusfallButton({ terminId }: { terminId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Termin als ausgefallen markieren? Der Slot wird wieder frei, die Historie bleibt erhalten.")) {
          startTransition(() => {
            void terminAlsAusgefallenMarkieren(terminId, "");
          });
        }
      }}
      className="text-[10px] text-[var(--color-danger)] hover:underline disabled:opacity-50"
    >
      Ausgefallen
    </button>
  );
}
