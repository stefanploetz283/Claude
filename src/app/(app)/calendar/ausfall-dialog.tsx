"use client";

import { useState, useTransition } from "react";
import { terminAlsAusgefallenMarkieren } from "./buchung-actions";
import { inputCls, labelCls, buttonDangerSolidCls, buttonSecondaryCls } from "../cases/case-ui";

/** Termin als ausgefallen markieren statt zu löschen - der Slot wird dadurch wieder frei (siehe Prompt Punkt 4). */
export function AusfallDialog({ terminId, titel, onDone }: { terminId: string; titel: string; onDone: () => void }) {
  const [notiz, setNotiz] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function bestaetigen() {
    startTransition(async () => {
      const result = await terminAlsAusgefallenMarkieren(terminId, notiz);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-text)]">
        „{titel}&quot; als ausgefallen markieren? Der Slot wird wieder frei und kann neu belegt werden. Der Termin bleibt in der Historie erhalten
        (relevant für die Auslastungsauswertung) - die Fachleistungsstunde/Ausfallregelung wird davon nicht berührt und muss separat dokumentiert werden.
      </p>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Notiz (optional)</span>
        <input value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z.B. Grund, Nachbesetzung" className={`w-full ${inputCls}`} />
      </label>
      {error && <p className="text-sm text-[var(--pros-status-critical-text)]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={bestaetigen} disabled={pending} className={buttonDangerSolidCls}>
          {pending ? "Speichere…" : "Als ausgefallen markieren"}
        </button>
        <button onClick={onDone} className={buttonSecondaryCls}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
