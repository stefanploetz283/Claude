"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NewEntryForm } from "../cases/[id]/service-entries/entry-form";
import { extractServiceEntryFromVoice, type VoiceCaseCandidate } from "./voice-actions";
import { ProsMicButton } from "@/components/pros/pros-mic-button";
import { cardCls, inputCls as caseInputCls, buttonPrimaryCls, noticeInfoCls } from "../cases/case-ui";

type CaseOption = { id: string; clientName: string; helpTypeName: string };

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
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Mobile Browser (v.a. Android Chrome) beenden die Spracherkennung intern oft schon nach wenigen Sekunden
// Stille, obwohl `continuous: true` gesetzt ist - "no-speech"/"aborted" sind dabei keine echten Fehler,
// sondern Teil dieses Verhaltens. Wird deshalb weder als Fehler angezeigt noch als Diktatende behandelt.
const RECOVERABLE_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

type Stage = "idle" | "recording" | "processing" | "review" | "confirmed";

type ReviewData = {
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  caseId: string;
  clientNameHeard: string;
  candidates: VoiceCaseCandidate[];
  autoSelected: boolean;
};

function computeDuration(startTime: string, endTime: string): string {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return "-";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")} Std.`;
}

export function VoiceEntryFlow({ caseOptions }: { caseOptions: CaseOption[] }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [supported, setSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const stopRequestedRef = useRef(false);
  const finalTextRef = useRef("");

  useEffect(() => {
    // Spracherkennung ist eine Browser-API, die serverseitig nicht existiert - Erkennung muss nach dem Mount laufen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const runExtraction = useCallback(async (text: string) => {
    setStage("processing");
    setError(null);
    const result = await extractServiceEntryFromVoice(text);
    if (!result.ok) {
      setError(result.error);
      setStage("idle");
      return;
    }
    setReview({
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
      description: result.remarks,
      caseId: result.autoSelectedCaseId ?? result.candidates[0]?.caseId ?? "",
      clientNameHeard: result.clientNameHeard,
      candidates: result.candidates,
      autoSelected: result.autoSelectedCaseId !== null,
    });
    setStage("review");
  }, []);

  // Läuft eine einzelne Erkennungs-"Session" (continuous:false). Android Chrome dupliziert/wiederholt
  // Text bei sehr langen continuous:true-Sessions (bekanntes Browser-Problem) - deshalb verketten wir
  // hier selbst kurze Einzel-Sessions zu einem fortlaufenden Diktat, statt eine Session lange offen zu
  // halten. finalTextRef sammelt über alle Sessions hinweg, jede Session selbst bleibt sauber und kurz.
  function beginSession() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setSupported(false);
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
        // Nächstes Segment nahtlos mit einer frischen Session anschließen, solange nicht aktiv gestoppt wurde.
        beginSession();
        return;
      }
      const text = finalTextRef.current.trim();
      if (text) {
        runExtraction(text);
      } else {
        setError("Es wurde nichts erkannt. Bitte erneut versuchen.");
        setStage("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  const startRecording = useCallback(() => {
    if (!getSpeechRecognition()) {
      setSupported(false);
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");
    setReview(null);
    finalTextRef.current = "";
    stopRequestedRef.current = false;
    setStage("recording");
    beginSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- beginSession ist eine stabile Funktionsdeklaration im Komponentenkörper, keine Closure über veränderliche Werte.
  }, [runExtraction]);

  const stopRecording = useCallback(() => {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const handleConfirm = useCallback(() => {
    if (!review || !review.caseId) return;
    setStage("confirmed");
  }, [review]);

  if (!supported) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-[var(--color-text)]">
          Dein Browser unterstützt keine Spracherkennung. Bitte verwende Chrome oder Edge, oder trage den Eintrag direkt im jeweiligen
          Fall unter &quot;Leistungsdokumentation&quot; ein.
        </p>
      </div>
    );
  }

  if (stage === "confirmed" && review) {
    const caseOption = caseOptions.find((c) => c.id === review.caseId);
    return (
      <div className="flex flex-col gap-4">
        <div className={cardCls}>
          <p className="text-sm text-[var(--color-text)]">
            Fall: <strong>{caseOption ? `${caseOption.clientName} (${caseOption.helpTypeName})` : review.caseId}</strong> - Felder
            prüfen und mit &quot;Eintragen&quot; speichern.
          </p>
        </div>
        <NewEntryForm
          caseId={review.caseId}
          initialValues={{ date: review.date, startTime: review.startTime, endTime: review.endTime, description: review.description }}
          redirectTo={`/cases/${review.caseId}/service-entries`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${cardCls} flex flex-col items-center gap-4 py-10 text-center`}>
        <ProsMicButton recording={stage === "recording"} onClick={stage === "recording" ? stopRecording : startRecording} disabled={stage === "processing"} size="lg" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {stage === "recording" && "Aufnahme läuft ... zum Beenden klicken."}
          {stage === "processing" && "Diktat wird verarbeitet ..."}
          {stage === "idle" &&
            'Klicke zum Diktieren, z. B. "Doku Michael Strickner, Datum 17. Juli 2026, Uhrzeit 8 bis 11:15, Bemerkung: ..."'}
        </p>
        {(transcript || interim) && stage === "recording" && (
          <p className="max-w-xl text-sm text-[var(--color-text)]">
            {transcript}
            <span className="text-[var(--color-text-muted)]">{interim}</span>
          </p>
        )}
        {error && <p className="text-sm text-[var(--pros-status-critical-text)]">{error}</p>}
      </div>

      {stage === "review" && review && (
        <ReviewPanel review={review} caseOptions={caseOptions} onChange={setReview} onConfirm={handleConfirm} />
      )}
    </div>
  );
}

function ReviewPanel({
  review,
  caseOptions,
  onChange,
  onConfirm,
}: {
  review: ReviewData;
  caseOptions: CaseOption[];
  onChange: (r: ReviewData) => void;
  onConfirm: () => void;
}) {
  const candidateIds = new Set(review.candidates.map((c) => c.caseId));
  const otherOptions = caseOptions.filter((c) => !candidateIds.has(c.id));

  return (
    <div className={cardCls}>
      {review.autoSelected ? (
        <p className={`mb-4 ${noticeInfoCls} text-[var(--color-primary)]`}>
          Klient erkannt anhand von &quot;{review.clientNameHeard}&quot;. Bitte trotzdem prüfen.
        </p>
      ) : review.candidates.length > 0 ? (
        <p className={`mb-4 ${noticeInfoCls} text-[var(--color-primary)]`}>
          Für &quot;{review.clientNameHeard}&quot; wurde kein eindeutiger Treffer gefunden. Bitte den richtigen Fall auswählen.
        </p>
      ) : (
        <p className={`mb-4 ${noticeInfoCls} text-[var(--color-primary)]`}>
          Der Klient &quot;{review.clientNameHeard}&quot; konnte nicht zugeordnet werden. Bitte den Fall manuell auswählen.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Fall" grow>
          <select value={review.caseId} onChange={(e) => onChange({ ...review, caseId: e.target.value })} className={inputCls}>
            <option value="">Bitte auswählen...</option>
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
              {otherOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName} ({c.helpTypeName})
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="Datum">
          <input type="date" value={review.date} onChange={(e) => onChange({ ...review, date: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Von">
          <input
            type="time"
            value={review.startTime}
            onChange={(e) => onChange({ ...review, startTime: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Bis">
          <input
            type="time"
            value={review.endTime}
            onChange={(e) => onChange({ ...review, endTime: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Dauer">
          <p className="px-1 py-2.5 text-sm text-[var(--color-text)]">{computeDuration(review.startTime, review.endTime)}</p>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Bemerkungstext" grow>
          <textarea value={review.description} onChange={(e) => onChange({ ...review, description: e.target.value })} rows={4} className={inputCls} />
        </Field>
      </div>

      <button onClick={onConfirm} disabled={!review.caseId} className={`mt-4 ${buttonPrimaryCls}`}>
        Übernehmen
      </button>
    </div>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${grow ? "min-w-[16rem] flex-1" : ""}`}>
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = `w-full ${caseInputCls}`;
