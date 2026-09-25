"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { buchenUeberSlot, buchenAdHoc, type BuchungActionState } from "./buchung-actions";
import { KATEGORIE_OPTIONS, TERMINART_OPTIONS } from "@/lib/termine/labels";
import type { TerminKategorie } from "@prisma/client";
import { inputCls, labelCls, buttonPrimaryCls, buttonSecondaryCls, buttonDangerSolidCls, noticeWarnCls } from "../cases/case-ui";
import { IconWarnTriangle } from "../cases/case-icons";

const fieldCls = `w-full ${inputCls}`;

export type CaseOption = { id: string; label: string; employeeId: string };
export type RaumOption = { id: string; label: string; standort: string | null };
export type MitarbeiterinOption = { id: string; name: string };

type SlotContext = { slotId: string; employeeId: string; tagLabel: string; zeitLabel: string; standardRaumId: string | null };
type AdHocContext = { defaultDate: string };

export function BuchungsFormular({
  slot,
  adHoc,
  caseOptions,
  raumOptions,
  mitarbeiterinnen,
  canBookForOthers,
  canOverrideConflicts,
  currentUserId,
  onDone,
}: {
  slot?: SlotContext;
  adHoc?: AdHocContext;
  caseOptions: CaseOption[];
  raumOptions: RaumOption[];
  mitarbeiterinnen: MitarbeiterinOption[];
  canBookForOthers: boolean;
  canOverrideConflicts: boolean;
  currentUserId: string;
  onDone: () => void;
}) {
  const action = slot ? buchenUeberSlot : buchenAdHoc;
  const [state, formAction, pending] = useActionState<BuchungActionState, FormData>(action, undefined);
  const [kategorie, setKategorie] = useState<TerminKategorie>("FALL_TERMIN");
  const [override, setOverride] = useState(false);
  const submittedRef = useRef(false);

  // useActionState liefert bei Erfolg wieder den Ausgangszustand (undefined) - Erfolg erkennen wir daran,
  // dass eine zuvor laufende Übermittlung ohne Fehler/Konflikt im Ergebnis abgeschlossen ist.
  useEffect(() => {
    if (pending) {
      submittedRef.current = true;
      return;
    }
    if (submittedRef.current && !state) {
      submittedRef.current = false;
      onDone();
    }
  }, [pending, state, onDone]);

  const konflikte = state?.konflikte ?? [];
  const zeigeKonflikt = konflikte.length > 0 && !override;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {slot && <input type="hidden" name="slotId" value={slot.slotId} />}
      {override && <input type="hidden" name="override" value="true" />}

      {slot && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {slot.tagLabel} · {slot.zeitLabel}
        </p>
      )}

      {adHoc && (
        <>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Mitarbeiterin</span>
            {!canBookForOthers && <input type="hidden" name="employeeId" value={currentUserId} />}
            <select name="employeeId" required disabled={!canBookForOthers} defaultValue={canBookForOthers ? "" : currentUserId} className={fieldCls}>
              {!canBookForOthers && <option value={currentUserId}>Ich</option>}
              {canBookForOthers && <option value="">Bitte wählen…</option>}
              {canBookForOthers && mitarbeiterinnen.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Datum</span>
              <input name="date" type="date" required defaultValue={adHoc.defaultDate} className={fieldCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Von</span>
              <input name="startTime" type="time" required className={fieldCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Bis</span>
              <input name="endTime" type="time" required className={fieldCls} />
            </label>
          </div>
        </>
      )}

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Terminkategorie</span>
        <select name="kategorie" value={kategorie} onChange={(e) => setKategorie(e.target.value as TerminKategorie)} className={fieldCls}>
          {KATEGORIE_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      {kategorie === "FALL_TERMIN" && (
        <>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Fall *</span>
            <select name="caseId" required className={fieldCls}>
              <option value="">Bitte wählen…</option>
              {caseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Terminart *</span>
            <select name="terminArt" required className={fieldCls}>
              <option value="">Bitte wählen…</option>
              {TERMINART_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {kategorie === "EINZELMASSNAHME" && (
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Name/Aktenzeichen *</span>
          <input name="einzelmassnahmeBezeichnung" required placeholder="z.B. Gesprächsweisung JGH, Az. …" className={fieldCls} />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Terminname{kategorie === "INTERNER_TERMIN" ? " *" : " (optional)"}</span>
        <input
          name="terminname"
          required={kategorie === "INTERNER_TERMIN"}
          placeholder={kategorie === "INTERNER_TERMIN" ? "z.B. Teambesprechung" : "z.B. Elterngespräch Trennungssituation"}
          className={fieldCls}
        />
        {kategorie === "FALL_TERMIN" && (
          <span className="text-[11px] text-[var(--color-text-muted)]">Wird im Kalender als Überschrift angezeigt (sonst die Terminart).</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Raum {slot ? "(überschreibt Standard-Raum der Vorlage)" : ""}</span>
        <select name="raumId" defaultValue={slot?.standardRaumId ?? ""} className={fieldCls}>
          <option value="">Kein Raum</option>
          {raumOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelCls}>Notiz (optional)</span>
        <input name="note" className={fieldCls} />
      </label>

      {zeigeKonflikt && (
        <div className={noticeWarnCls}>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--pros-status-attention-text)]">
            <IconWarnTriangle /> Terminkonflikt erkannt
          </p>
          <ul className="flex flex-col gap-1 text-sm text-[var(--pros-status-attention-text)]">
            {konflikte.map((k) => (
              <li key={k.terminId}>
                {k.ueberlappungMinuten} Min. Überschneidung mit „{k.titel}&quot; ({k.mitarbeiterinName})
              </li>
            ))}
          </ul>
          {canOverrideConflicts ? (
            <button type="button" onClick={() => setOverride(true)} className={`mt-3 ${buttonDangerSolidCls}`}>
              Trotzdem buchen
            </button>
          ) : (
            <p className="mt-2 text-xs text-[var(--pros-status-attention-text)]">Bitte eine andere Zeit/einen anderen Raum wählen.</p>
          )}
        </div>
      )}

      {state?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending || zeigeKonflikt} className={buttonPrimaryCls}>
          {pending ? "Speichere…" : "Termin buchen"}
        </button>
        <button type="button" onClick={onDone} className={buttonSecondaryCls}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
