"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NewEntryForm } from "../cases/[id]/service-entries/entry-form";
import { extractServiceEntryFromVoice, type VoiceCaseCandidate } from "./voice-actions";

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

  const startRecording = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setSupported(false);
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");
    setReview(null);

    let finalText = "";
    let hasErrored = false;
    stopRequestedRef.current = false;

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      setTranscript(finalText);
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
        // Browserseitiger Zwischenstopp (z.B. kurze Sprechpause) - nahtlos weiterhören, statt das Diktat zu beenden.
        try {
          recognition.start();
          return;
        } catch {
          // Erkennung lief bereits o.ä. - dann regulär als Ende behandeln.
        }
      }
      const text = finalText.trim();
      if (text) {
        runExtraction(text);
      } else {
        setError("Es wurde nichts erkannt. Bitte erneut versuchen.");
        setStage("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStage("recording");
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
        {stage === "recording" ? (
          <button
            onClick={stopRecording}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-coral)] text-white shadow-[var(--shadow-soft)] transition"
            aria-label="Aufnahme stoppen"
          >
            <span className="h-4 w-4 animate-pulse rounded-full bg-white" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={stage === "processing"}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            aria-label="Aufnahme starten"
          >
            <MicIcon />
          </button>
        )}
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
        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
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
        <p className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-sm text-[var(--color-primary)]">
          Klient erkannt anhand von &quot;{review.clientNameHeard}&quot;. Bitte trotzdem prüfen.
        </p>
      ) : review.candidates.length > 0 ? (
        <p className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-sm text-[var(--color-primary)]">
          Für &quot;{review.clientNameHeard}&quot; wurde kein eindeutiger Treffer gefunden. Bitte den richtigen Fall auswählen.
        </p>
      ) : (
        <p className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] px-3.5 py-2.5 text-sm text-[var(--color-primary)]">
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

      <button
        onClick={onConfirm}
        disabled={!review.caseId}
        className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
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

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
