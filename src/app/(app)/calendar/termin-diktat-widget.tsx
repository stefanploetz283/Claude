"use client";

import { useRef, useState } from "react";
import { extractTerminFromVoice, type TerminCaseCandidate } from "@/lib/termine/diktat-extraktion";
import { buchenAdHoc } from "./buchung-actions";
import { KATEGORIE_OPTIONS, TERMINART_OPTIONS } from "@/lib/termine/labels";
import type { TerminKategorie, TerminArt } from "@prisma/client";
import type { CaseOption, RaumOption, MitarbeiterinOption } from "./buchungs-formular";
import type { TerminKonflikt } from "@/lib/termine/konflikte";
import { ProsMicButton } from "@/components/pros/pros-mic-button";
import { inputCls, labelCls, buttonPrimaryCls, noticeWarnCls, buttonDangerSolidCls } from "../cases/case-ui";
import { IconWarnTriangle } from "../cases/case-icons";

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
  terminname: string;
  einzelmassnahmeBezeichnung: string | null;
  date: string;
  startTime: string;
  endTime: string;
  caseId: string;
  clientNameHeard: string | null;
  candidates: TerminCaseCandidate[];
};

const fieldCls = `w-full ${inputCls}`;

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
      terminname: result.terminname,
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
    if (review.kategorie === "INTERNER_TERMIN" && !review.terminname.trim()) {
      setError("Bitte einen Terminnamen angeben.");
      return;
    }
    setStage("saving");
    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("kategorie", review.kategorie);
    if (review.terminArt) fd.set("terminArt", review.terminArt);
    if (review.caseId) fd.set("caseId", review.caseId);
    if (review.einzelmassnahmeBezeichnung) fd.set("einzelmassnahmeBezeichnung", review.einzelmassnahmeBezeichnung);
    if (review.terminname.trim()) fd.set("terminname", review.terminname.trim());
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
          <ProsMicButton recording={stage === "recording"} onClick={stage === "recording" ? stopRecording : startRecording} />
          <p className="text-sm text-[var(--color-text-muted)]">{stage === "recording" ? "Aufnahme läuft … zum Beenden klicken." : "Klicke zum Diktieren, z.B. „Elternberatung Familie Müller morgen 14 bis 15 Uhr“."}</p>
          {(transcript || interim) && (
            <p className="max-w-sm text-sm text-[var(--color-text)]">
              {transcript}
              <span className="text-[var(--color-text-muted)]">{interim}</span>
            </p>
          )}
          {error && <p className="text-sm text-[var(--pros-status-critical-text)]">{error}</p>}
        </div>
      )}

      {stage === "processing" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Diktat wird verarbeitet …</p>}

      {stage === "review" && review && (
        <div className="flex flex-col gap-3">
          {review.clientNameHeard && <p className="text-xs text-[var(--color-text-muted)]">Erkannt: „{review.clientNameHeard}&quot; – bitte prüfen.</p>}
          {canBookForOthers && (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Mitarbeiterin</span>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={fieldCls}>
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
            <select value={review.kategorie} onChange={(e) => setReview({ ...review, kategorie: e.target.value as TerminKategorie })} className={fieldCls}>
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
                <select value={review.caseId} onChange={(e) => setReview({ ...review, caseId: e.target.value })} className={fieldCls}>
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
                <select value={review.terminArt ?? ""} onChange={(e) => setReview({ ...review, terminArt: (e.target.value || null) as TerminArt | null })} className={fieldCls}>
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
              <input value={review.einzelmassnahmeBezeichnung ?? ""} onChange={(e) => setReview({ ...review, einzelmassnahmeBezeichnung: e.target.value })} className={fieldCls} />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Terminname{review.kategorie === "INTERNER_TERMIN" ? "" : " (optional)"}</span>
            <input
              value={review.terminname}
              onChange={(e) => setReview({ ...review, terminname: e.target.value })}
              placeholder="z.B. Elterngespräch Trennungssituation"
              className={fieldCls}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Datum</span>
              <input type="date" value={review.date} onChange={(e) => setReview({ ...review, date: e.target.value })} className={fieldCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Von</span>
              <input type="time" value={review.startTime} onChange={(e) => setReview({ ...review, startTime: e.target.value })} className={fieldCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>Bis</span>
              <input type="time" value={review.endTime} onChange={(e) => setReview({ ...review, endTime: e.target.value })} className={fieldCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Raum (optional)</span>
            <select value={raumId} onChange={(e) => setRaumId(e.target.value)} className={fieldCls}>
              <option value="">Kein Raum</option>
              {raumOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {konflikte.length > 0 && (
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
              <button onClick={() => confirmSave(true)} className={`mt-3 ${buttonDangerSolidCls}`}>
                Trotzdem buchen
              </button>
            </div>
          )}
          {error && <p className="text-sm text-[var(--pros-status-critical-text)]">{error}</p>}
          {konflikte.length === 0 && (
            <button onClick={() => confirmSave(false)} className={`self-start ${buttonPrimaryCls}`}>
              Übernehmen
            </button>
          )}
        </div>
      )}

      {stage === "saving" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Wird gespeichert …</p>}
      {stage === "done" && <p className="py-8 text-center text-sm font-medium text-[var(--color-primary)]">Termin gebucht.</p>}
    </div>
  );
}
