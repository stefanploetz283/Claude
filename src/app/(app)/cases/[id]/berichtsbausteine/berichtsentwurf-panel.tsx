"use client";

import { useState, useTransition } from "react";
import { cardCls, inputCls as baseInputCls, APPROVAL_TONE } from "@/app/(app)/cases/case-ui";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import {
  runVollstaendigkeitspruefung,
  generateAbschlussbericht,
  updateAbschlussberichtEntwurf,
  submitAbschlussberichtForApproval,
  type VollstaendigkeitspruefungResult,
} from "./generierung-actions";

type Entwurf = {
  text: string;
  status: "IN_BEARBEITUNG" | "WARTET_AUF_FREIGABE" | "FREIGEGEBEN" | "KORREKTUR_ANGEFORDERT";
  generiertAmLabel: string;
  correctionNote: string | null;
};

const STATUS_LABELS: Record<Entwurf["status"], string> = {
  IN_BEARBEITUNG: "In Bearbeitung",
  WARTET_AUF_FREIGABE: "Wartet auf Freigabe",
  FREIGEGEBEN: "Freigegeben",
  KORREKTUR_ANGEFORDERT: "Korrektur angefordert",
};
const inputCls = `w-full ${baseInputCls}`;

export function BerichtsentwurfPanel({ caseId, entwurf }: { caseId: string; entwurf: Entwurf | null }) {
  const [pruefung, setPruefung] = useState<VollstaendigkeitspruefungResult | null>(null);
  const [ichPerspektiveBestaetigt, setIchPerspektiveBestaetigt] = useState(false);
  const [text, setText] = useState(entwurf?.text ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [gespeichertHinweis, setGespeichertHinweis] = useState(false);

  const editierbar = !entwurf || entwurf.status === "IN_BEARBEITUNG" || entwurf.status === "KORREKTUR_ANGEFORDERT";
  const kannGenerieren =
    pruefung?.ok === true && (!pruefung.mehrereFachkraefte || ichPerspektiveBestaetigt) && pruefung.manualVorhanden;

  function handlePruefen() {
    setError(null);
    startTransition(async () => {
      const result = await runVollstaendigkeitspruefung(caseId);
      setPruefung(result);
      if (!result.ok) setError(result.error);
    });
  }

  function handleGenerieren() {
    setError(null);
    startTransition(async () => {
      const result = await generateAbschlussbericht(caseId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPruefung(null);
      setIchPerspektiveBestaetigt(false);
    });
  }

  function handleSpeichern() {
    setError(null);
    setGespeichertHinweis(false);
    startTransition(async () => {
      const result = await updateAbschlussberichtEntwurf(caseId, text);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setGespeichertHinweis(true);
    });
  }

  function handleEinreichen() {
    setError(null);
    startTransition(async () => {
      const result = await submitAbschlussberichtForApproval(caseId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className={cardCls}>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Abschlussbericht-Entwurf</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Vollständigkeitsprüfung vor der Generierung, danach vollständig frei editierbarer Entwurf bis zur Freigabe.
      </p>

      {entwurf && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <ProsStatusPill tone={APPROVAL_TONE[entwurf.status]}>{STATUS_LABELS[entwurf.status]}</ProsStatusPill>
          <span>Generiert am {entwurf.generiertAmLabel}</span>
        </div>
      )}

      {entwurf?.status === "KORREKTUR_ANGEFORDERT" && entwurf.correctionNote && (
        <p className="mb-4 rounded-[var(--pros-r-sm)] bg-[var(--color-coral-soft)] px-3.5 py-2.5 text-sm text-[var(--pros-status-critical-text)]">
          Korrekturhinweis: {entwurf.correctionNote}
        </p>
      )}

      {!entwurf?.status || entwurf.status === "IN_BEARBEITUNG" || entwurf.status === "KORREKTUR_ANGEFORDERT" ? (
        <div className="mb-4 flex flex-col gap-3 rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)] bg-[var(--color-bg)] p-4">
          <button
            onClick={handlePruefen}
            disabled={pending}
            className="self-start rounded-[var(--pros-r-sm)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
          >
            {pending ? "Wird geprüft…" : "Vollständigkeit prüfen"}
          </button>

          {pruefung?.ok && (
            <div className="flex flex-col gap-3 text-sm">
              {!pruefung.manualVorhanden && (
                <p className="text-[var(--pros-status-critical-text)]">
                  Für die Hilfeart dieses Falls ist noch kein Berichtsmanual hinterlegt (Angebotskatalog) - Generierung nicht möglich.
                </p>
              )}
              {pruefung.manualLuecken.filter((l) => l.hinweis).length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-[var(--color-text)]">Hinweise gegen die Manual-Leitfragen:</p>
                  <ul className="flex flex-col gap-1 text-[var(--color-text-muted)]">
                    {pruefung.manualLuecken
                      .filter((l) => l.hinweis)
                      .map((l) => (
                        <li key={l.kapitel}>· {l.hinweis}</li>
                      ))}
                  </ul>
                </div>
              )}
              {pruefung.leistungsnachweisHinweise.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-[var(--color-text)]">Hinweise gegen die Leistungsnachweis-Historie:</p>
                  <ul className="flex flex-col gap-1 text-[var(--color-text-muted)]">
                    {pruefung.leistungsnachweisHinweise.map((h) => (
                      <li key={`${h.jahr}-${h.monat}`}>· {h.hinweis}</li>
                    ))}
                  </ul>
                </div>
              )}
              {pruefung.manualLuecken.every((l) => !l.hinweis) && pruefung.leistungsnachweisHinweise.length === 0 && (
                <p className="text-[var(--color-text-muted)]">Keine auffälligen Lücken gefunden.</p>
              )}

              {pruefung.mehrereFachkraefte && (
                <label className="flex items-start gap-2 rounded-[var(--pros-r-sm)] bg-[var(--color-warn-soft)] p-3 text-[var(--color-warn-text)]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={ichPerspektiveBestaetigt}
                    onChange={(e) => setIchPerspektiveBestaetigt(e.target.checked)}
                  />
                  <span>
                    Bausteine stammen von mehreren Fachkräften ({pruefung.fachkraefteNamen.join(", ")}). Ich bestätige: Der Bericht wird
                    aus der Ich-Perspektive von <strong>{pruefung.fallfuehrendeFachkraftName}</strong> (fallführende Fachkraft)
                    geschrieben.
                  </span>
                </label>
              )}

              <button
                onClick={handleGenerieren}
                disabled={pending || !kannGenerieren}
                className="self-start rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {pending ? "Wird generiert…" : entwurf ? "Erneut generieren" : "Abschlussbericht generieren"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {entwurf && (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setGespeichertHinweis(false);
            }}
            readOnly={!editierbar}
            rows={22}
            className={`${inputCls} font-mono text-xs whitespace-pre-wrap ${!editierbar ? "opacity-70" : ""}`}
          />
          {editierbar && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSpeichern}
                disabled={pending}
                className="rounded-[var(--pros-r-sm)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
              >
                {pending ? "Speichern…" : "Änderungen speichern"}
              </button>
              <button
                onClick={handleEinreichen}
                disabled={pending}
                className="rounded-[var(--pros-r-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                Zur Freigabe einreichen
              </button>
              {gespeichertHinweis && <span className="text-sm text-[var(--color-text-muted)]">Gespeichert.</span>}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--pros-status-critical-text)]">{error}</p>}
    </div>
  );
}
