"use client";

import { useRef, useState } from "react";
import { extractInterimEntryFromVoice } from "@/lib/interim/extraction";
import { createInterimEntry } from "../actions";

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

// "no-speech"/"aborted" treten bei Sprechpausen regelmäßig auf und sind keine echten Fehler.
const RECOVERABLE_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

type Stage = "idle" | "recording" | "processing" | "review" | "saving" | "done";
type ReviewData = { date: string; startTime: string; endTime: string; content: string };

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export function InterimDictateWidget({ caseId }: { caseId: string }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const stopRequestedRef = useRef(false);
  const finalTextRef = useRef("");

  // Läuft eine einzelne Erkennungs-"Session" (continuous:false) und verkettet bei Bedarf eine frische
  // Session an - vermeidet das bekannte Android-Chrome-Problem mit doppeltem/wiederholtem Text bei
  // langen durchgehenden Aufnahmen (siehe Diktat-Fix im Hauptsystem).
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
    const result = await extractInterimEntryFromVoice(text);
    if (!result.ok) {
      setError(result.error);
      setStage("idle");
      return;
    }
    setReview({ date: result.date, startTime: result.startTime, endTime: result.endTime, content: result.content });
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

  function resetAll() {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
    setStage("idle");
    setTranscript("");
    setInterim("");
    setError(null);
    setReview(null);
  }

  async function confirmSave() {
    if (!review) return;
    setStage("saving");
    const fd = new FormData();
    fd.set("caseId", caseId);
    fd.set("date", review.date);
    fd.set("startTime", review.startTime);
    fd.set("endTime", review.endTime);
    fd.set("content", review.content);
    const result = await createInterimEntry(undefined, fd);
    if (result?.error) {
      setError(result.error);
      setStage("review");
      return;
    }
    setStage("done");
    setTimeout(resetAll, 1200);
  }

  return (
    <div className={cardCls}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Diktat</h2>

      {(stage === "idle" || stage === "recording") && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          {stage === "recording" ? (
            <button
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-coral)] text-white shadow-[var(--shadow-soft)]"
              aria-label="Aufnahme stoppen"
            >
              <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
              aria-label="Aufnahme starten"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
          <p className="text-sm text-[var(--color-text-muted)]">
            {stage === "recording" ? "Aufnahme läuft … zum Beenden klicken." : "Klicke zum Diktieren."}
          </p>
          {(transcript || interim) && (
            <p className="max-w-xl text-sm text-[var(--color-text)]">
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
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
              <input type="date" value={review.date} onChange={(e) => setReview({ ...review, date: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Beginn</span>
              <input type="time" value={review.startTime} onChange={(e) => setReview({ ...review, startTime: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Ende</span>
              <input type="time" value={review.endTime} onChange={(e) => setReview({ ...review, endTime: e.target.value })} className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Maßnahmen – Inhalte – Vereinbarungen – Besonderes</span>
            <textarea
              rows={4}
              value={review.content}
              onChange={(e) => setReview({ ...review, content: e.target.value })}
              className={inputCls}
            />
          </label>
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={confirmSave}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
            >
              Übernehmen
            </button>
            <button onClick={resetAll} className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)]">
              Verwerfen
            </button>
          </div>
        </div>
      )}

      {stage === "saving" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Wird gespeichert …</p>}
      {stage === "done" && <p className="py-8 text-center text-sm font-medium text-[var(--color-primary)]">✓ Eintrag gespeichert.</p>}
    </div>
  );
}
