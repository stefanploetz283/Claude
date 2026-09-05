"use client";

import { useRef, useState } from "react";
import { extractTerminFromVoice, type TerminCaseCandidate } from "@/lib/termine/diktat-extraktion";
import { buchenAdHoc } from "./buchung-actions";
import { KATEGORIE_OPTIONS, TERMINART_OPTIONS } from "@/lib/termine/labels";
import type { TerminKategorie, TerminArt } from "@prisma/client";
import type { CaseOption, RaumOption, MitarbeiterinOption } from "./buchungs-formular";
import type { TerminKonflikt } from "@/lib/termine/konflikte";

type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionErrorEventLike = { error: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
function getSpeechRecognition(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const RECOVERABLE_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

type Stage = "idle" | "recording" | "processing" | "review" | "saving" | "done";
type Review = {
  kategorie: TerminKategorie;
  terminArt: TerminArt | null;
  titel: string;
  einzelmassnahmeBezeichnung: string | null;
  date: string;
  startTime: string;
  endTime: string;
  caseId: string;
  clientNameHeard: string | null;
  candidates: TerminCaseCandidate[];
};

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export function TerminDiktatWidget({
  currentUserId,
  mitarbeiterinnen,
  canBookForOthers,
  caseOptions,
  raumOptions,
  onDone,
}: {
  currentUserId: string;
  mitarbeiterinnen: MitarbeiterinOption[];
  canBookForOthers: boolean;
  caseOptions: CaseOption[];
  raumOptions: RaumOption[];
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(currentUserId);
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [raumId, setRaumId] = useState("");
  const [konflikte, setKonflikte] = useState<TerminKonflikt[]>([]);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const stopRequestedRef = useRef(false);
  const finalTextRef = useRef("");

  function beginSession() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError("Dein Browser unterstützt keine Spracherkennung. Bitte Chrome oder Edge verwenden.");
      setStage("idle");
      return;
    }
    let hasErrored = false;
    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTextRef.current += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      setTranscript(finalTextRef.current);
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (RECOVERABLE_RECOGNITION_ERRORS.has(event.error)) return;
      hasErrored = true;
      setError("Die Spracherkennung ist fehlgeschlagen. Bitte erneut versuchen.");
      setStage("idle");
    };
    recognition.onend = () => {
      if (hasErrored) return;
      if (!stopRequestedRef.current) {
        beginSession();
        return;
      }
      const text = finalTextRef.current.trim();
      if (text) runExtraction(text);
      else {
        setError("Es wurde nichts erkannt. Bitte erneut versuchen.");
        setStage("idle");
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  async function runExtraction(text: string) {
    setStage("processing");
    setError(null);
    const result = await extractTerminFromVoice(text);
    if (!result.ok) {
      setError(result.error);
      setStage("idle");
      return;
    }
    setReview({
      kategorie: result.kategorie,
      terminArt: result.terminArt,
      titel: result.titel,
      einzelmassnahmeBezeichnung: result.einzelmassnahmeBezeichnung,
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
      caseId: result.autoSelectedCaseId ?? result.candidates[0]?.caseId ?? "",
      clientNameHeard: result.clientNameHeard,
      candidates: result.candidates,
    });
    setStage("review");
  }

  function startRecording() {
    setError(null);
    setTranscript("");
    setInterim("");
    finalTextRef.current = "";
    stopRequestedRef.current = false;
    setStage("recording");
    beginSession();
  }
  function stopRecording() {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  }

  async function confirmSave(override = false) {
    if (!review) return;
    if (review.kategorie === "FALL_TERMIN" && !review.caseId) {
      setError("Bitte einen Fall auswählen.");
      return;
    }
    setStage("saving");
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("kategorie", review.kategorie);
    if (review.terminArt) fd.set("terminArt", review.terminArt);
    if (review.caseId) fd.set("caseId", review.caseId);
    if (review.einzelmassnahmeBezeichnung) fd.set("einzelmassnahmeBezeichnung", review.einzelmassnahmeBezeichnung);
    fd.set("titel", review.titel);
    fd.set("date", review.date);
    fd.set("startTime", review.startTime);
    fd.set("endTime", review.endTime);
    if (raumId) fd.set("raumId", raumId);
    if (override) fd.set("override", "true");

    const result = await buchenAdHoc(undefined, fd);
    if (result?.konflikte) {
      setKonflikte(result.konflikte);
      setStage("review");
      return;
    }
    if (result?.error) {
      setError(result.error);
      setStage("review");
      return;
    }
    setStage("done");
    setTimeout(onDone, 1200);
  }

  const candidateIds = new Set(review?.candidates.map((c) => c.caseId) ?? []);
  const otherCases = caseOptions.filter((c) => !candidateIds.has(c.id));

  return (
    <div className="flex flex-col gap-3">
      {(stage === "idle" || stage === "recording") && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          {stage === "recording" ? (
            <button onClick={stopRecording} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-coral)] text-white shadow-[var(--shadow-soft)]" aria-label="Aufnahme stoppen">
              <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white" />
            </button>
          ) : (
            <button onClick={startRecording} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-primary-hover)]" aria-label="Aufnahme starten">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
          <p className="text-sm text-[var(--color-text-muted)]">{stage === "recording" ? "Aufnahme läuft … zum Beenden klicken." : "Klicke zum Diktieren, z.B. „Elternberatung Familie Müller morgen 14 bis 15 Uhr“."}</p>
          {(transcript || interim) && (
            <p className="max-w-sm text-sm text-[var(--color-text)]">
              {transcript}
              <span className="text-[var(--color-text-muted)]">{interim}</span>
            </p>
          )}
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
        </div>
      )}

      {stage === "processing" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Diktat wird verarbeitet …</p>}

      {stage === "review" && review && (
        <div className="flex flex-col gap-3">
          {review.clientNameHeard && <p className="text-xs text-[var(--color-text-muted)]">Erkannt: „{review.clientNameHeard}&quot; – bitte prüfen.</p>}
          {canBookForOthers && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Mitarbeiterin</span>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
                {mitarbeiterinnen.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Terminkategorie</span>
            <select value={review.kategorie} onChange={(e) => setReview({ ...review, kategorie: e.target.value as TerminKategorie })} className={inputCls}>
              {KATEGORIE_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          {review.kategorie === "FALL_TERMIN" && (
            <>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Fall</span>
                <select value={review.caseId} onChange={(e) => setReview({ ...review, caseId: e.target.value })} className={inputCls}>
                  <option value="">Bitte auswählen…</option>
                  {review.candidates.length > 0 && (
                    <optgroup label="Vorschläge">
                      {review.candidates.map((c) => (
                        <option key={c.caseId} value={c.caseId}>
                          {c.clientName} ({c.helpTypeName})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Alle Fälle">
                    {otherCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Terminart</span>
                <select value={review.terminArt ?? ""} onChange={(e) => setReview({ ...review, terminArt: (e.target.value || null) as TerminArt | null })} className={inputCls}>
                  <option value="">Bitte auswählen…</option>
                  {TERMINART_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {review.kategorie === "EINZELMASSNAHME" && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Name/Aktenzeichen</span>
              <input value={review.einzelmassnahmeBezeichnung ?? ""} onChange={(e) => setReview({ ...review, einzelmassnahmeBezeichnung: e.target.value })} className={inputCls} />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Kurzbezeichnung</span>
            <input value={review.titel} onChange={(e) => setReview({ ...review, titel: e.target.value })} className={inputCls} />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Datum</span>
              <input type="date" value={review.date} onChange={(e) => setReview({ ...review, date: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Von</span>
              <input type="time" value={review.startTime} onChange={(e) => setReview({ ...review, startTime: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Bis</span>
              <input type="time" value={review.endTime} onChange={(e) => setReview({ ...review, endTime: e.target.value })} className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Raum (optional)</span>
            <select value={raumId} onChange={(e) => setRaumId(e.target.value)} className={inputCls}>
              <option value="">Kein Raum</option>
              {raumOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {konflikte.length > 0 && (
            <div className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--color-warn-text)]">⚠ Terminkonflikt erkannt</p>
              <ul className="flex flex-col gap-1 text-sm text-[var(--color-warn-text)]">
                {konflikte.map((k) => (
                  <li key={k.terminId}>
                    {k.ueberlappungMinuten} Min. Überschneidung mit „{k.titel}&quot; ({k.mitarbeiterinName})
                  </li>
                ))}
              </ul>
              <button onClick={() => confirmSave(true)} className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Trotzdem buchen
              </button>
            </div>
          )}
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
          {konflikte.length === 0 && (
            <button
              onClick={() => confirmSave(false)}
              className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Übernehmen
            </button>
          )}
        </div>
      )}

      {stage === "saving" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Wird gespeichert …</p>}
      {stage === "done" && <p className="py-8 text-center text-sm font-medium text-[var(--color-primary)]">✓ Termin gebucht.</p>}
    </div>
  );
}
