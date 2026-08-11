"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractServiceEntryFromVoice,
  extractTimeEntryFromVoice,
  type VoiceCaseCandidate,
} from "@/app/(app)/voice-entry/voice-actions";
import { getCaseOptionsForGlobalDictate, type GlobalDictateCaseOption } from "@/app/(app)/voice-entry/global-dictate-actions";
import { createServiceEntry } from "@/app/(app)/cases/[id]/service-entries/actions";
import { createManualEntry } from "@/app/(app)/zeit-kapazitaet/zeiterfassung/actions";
import { queueDictation, getPendingDictations, removePendingDictation, type PendingDictation } from "@/lib/offline-queue";

type Mode = "leistung" | "zeit";
type Stage = "idle" | "recording" | "processing" | "review" | "saving" | "done" | "queued";

type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type LeistungReview = {
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  caseId: string;
  clientNameHeard: string;
  candidates: VoiceCaseCandidate[];
};

type ZeitReview = {
  date: string;
  durationHours: string;
  note: string;
  assignmentType: "case" | "general";
  generalActivity: "VERWALTUNG" | "FAHRZEITEN" | "SONSTIGES";
  caseId: string;
  clientNameHeard: string | null;
  candidates: VoiceCaseCandidate[];
};

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export function GlobalDictateWidget() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leistungReview, setLeistungReview] = useState<LeistungReview | null>(null);
  const [zeitReview, setZeitReview] = useState<ZeitReview | null>(null);
  const [cases, setCases] = useState<GlobalDictateCaseOption[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingDictation[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const items = await getPendingDictations();
      setPendingItems(items);
      setPendingCount(items.length);
    } catch {
      // IndexedDB evtl. nicht verfügbar (privater Modus etc.) - dann bleibt der Zähler bei 0
    }
  }, []);

  useEffect(() => {
    // IndexedDB-Abfrage ist asynchron und browserseitig - Warteschlangen-Stand muss nach dem Mount geladen werden.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPending();
    const onOnline = () => {
      void refreshPending();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshPending]);

  function resetAll() {
    setMode(null);
    setStage("idle");
    setTranscript("");
    setInterim("");
    setError(null);
    setLeistungReview(null);
    setZeitReview(null);
    setActiveQueueId(null);
  }

  function openMode(m: Mode) {
    setMode(m);
    setStage("idle");
    setError(null);
    setActiveQueueId(null);
    if (cases.length === 0) {
      getCaseOptionsForGlobalDictate()
        .then(setCases)
        .catch(() => {});
    }
  }

  const runExtraction = useCallback(async (m: Mode, text: string, existingQueueId?: string) => {
    setStage("processing");
    setError(null);
    try {
      if (m === "leistung") {
        const result = await extractServiceEntryFromVoice(text);
        if (!result.ok) {
          setError(result.error);
          setStage("idle");
          return;
        }
        setLeistungReview({
          date: result.date,
          startTime: result.startTime,
          endTime: result.endTime,
          description: result.remarks,
          caseId: result.autoSelectedCaseId ?? result.candidates[0]?.caseId ?? "",
          clientNameHeard: result.clientNameHeard,
          candidates: result.candidates,
        });
        setStage("review");
      } else {
        const result = await extractTimeEntryFromVoice(text);
        if (!result.ok) {
          setError(result.error);
          setStage("idle");
          return;
        }
        const isCase = result.activityType === "FALL";
        setZeitReview({
          date: result.date,
          durationHours: (result.durationMinutes / 60).toFixed(2),
          note: result.note,
          assignmentType: isCase ? "case" : "general",
          generalActivity: isCase ? "SONSTIGES" : (result.activityType as "VERWALTUNG" | "FAHRZEITEN" | "SONSTIGES"),
          caseId: isCase ? (result.autoSelectedCaseId ?? result.candidates[0]?.caseId ?? "") : "",
          clientNameHeard: result.clientNameHeard,
          candidates: result.candidates,
        });
        setStage("review");
      }
    } catch {
      // Server Action nicht erreichbar -> vermutlich offline: lokal zwischenspeichern statt Fehler zeigen.
      // Stammt der Text bereits aus der Warteschlange, dort nicht erneut anlegen (sonst Dubletten).
      if (!existingQueueId) await queueDictation(m, text);
      await refreshPending();
      setStage("queued");
    }
  }, [refreshPending]);

  function startRecording(m: Mode) {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError("Dein Browser unterstützt keine Spracherkennung. Bitte Chrome oder Edge verwenden.");
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");

    let finalText = "";
    let hasErrored = false;
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
    recognition.onerror = () => {
      hasErrored = true;
      setError("Die Spracherkennung ist fehlgeschlagen. Bitte erneut versuchen.");
      setStage("idle");
    };
    recognition.onend = () => {
      if (hasErrored) return;
      const text = finalText.trim();
      if (text) runExtraction(m, text);
      else {
        setError("Es wurde nichts erkannt. Bitte erneut versuchen.");
        setStage("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStage("recording");
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  async function confirmLeistung() {
    if (!leistungReview || !leistungReview.caseId) return;
    setStage("saving");
    const fd = new FormData();
    fd.set("caseId", leistungReview.caseId);
    fd.set("date", leistungReview.date);
    fd.set("startTime", leistungReview.startTime);
    fd.set("endTime", leistungReview.endTime);
    fd.set("description", leistungReview.description);
    const result = await createServiceEntry(undefined, fd);
    if (result?.error) {
      setError(result.error);
      setStage("review");
      return;
    }
    setStage("done");
    setTimeout(resetAll, 1600);
  }

  async function confirmZeit() {
    if (!zeitReview) return;
    if (zeitReview.assignmentType === "case" && !zeitReview.caseId) return;
    setStage("saving");
    const fd = new FormData();
    fd.set("assignmentType", zeitReview.assignmentType);
    if (zeitReview.assignmentType === "case") fd.set("caseId", zeitReview.caseId);
    else fd.set("generalActivity", zeitReview.generalActivity);
    fd.set("date", zeitReview.date);
    fd.set("durationHours", zeitReview.durationHours);
    fd.set("note", zeitReview.note);
    const result = await createManualEntry(undefined, fd);
    if (result?.error) {
      setError(result.error);
      setStage("review");
      return;
    }
    setStage("done");
    setTimeout(resetAll, 1600);
  }

  async function processQueueItem(item: PendingDictation) {
    setShowQueue(false);
    setMode(item.mode);
    // Vor der Extraktion merken, damit bei erneutem Offline-Fehlschlag keine Dublette angelegt wird
    // (runExtraction bekommt die ID unten mit) und nach erfolgreicher Speicherung gelöscht werden kann.
    setActiveQueueId(item.id);
    await runExtraction(item.mode, item.transcript, item.id);
  }

  // Nach erfolgreichem Speichern eines aus der Warteschlange stammenden Eintrags: aus IndexedDB löschen.
  useEffect(() => {
    if (stage === "done" && activeQueueId) {
      removePendingDictation(activeQueueId).then(refreshPending);
      // Aufräumen des lokalen Zustands, nachdem der Löschvorgang in der externen IndexedDB angestoßen wurde.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveQueueId(null);
    }
  }, [stage, activeQueueId, refreshPending]);

  const overlayOpen = mode != null;

  return (
    <>
      <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
        {pendingCount > 0 && (
          <button
            onClick={() => setShowQueue(true)}
            className="rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-xs font-semibold text-[#3D2B00] shadow-[var(--shadow-soft)]"
          >
            {pendingCount} Diktat{pendingCount > 1 ? "e" : ""} wartet{pendingCount > 1 ? "en" : ""} auf Synchronisierung
          </button>
        )}
        <button
          aria-label="Diktat Zeit"
          onClick={() => openMode("zeit")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_6px_18px_rgba(0,0,0,.25)] transition hover:bg-[var(--color-primary-hover)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
          </svg>
        </button>
        <button
          aria-label="Diktat Leistung"
          onClick={() => openMode("leistung")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_6px_18px_rgba(0,0,0,.25)] transition hover:bg-[var(--color-primary-hover)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        </button>
      </div>

      {showQueue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowQueue(false)}>
          <div
            className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Wartende Diktate</h2>
            <ul className="flex flex-col gap-2">
              {pendingItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm">
                  <span className="text-[var(--color-text)]">
                    {item.mode === "leistung" ? "Leistung" : "Zeit"} · {new Date(item.createdAt).toLocaleString("de-DE")}
                  </span>
                  <button
                    onClick={() => processQueueItem(item)}
                    className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    Jetzt prüfen
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowQueue(false)} className="mt-4 text-xs font-medium text-[var(--color-text-muted)] hover:underline">
              Schließen
            </button>
          </div>
        </div>
      )}

      {overlayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">{mode === "leistung" ? "Diktat Leistung" : "Diktat Zeit"}</h2>
              <button onClick={resetAll} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" aria-label="Schließen">
                ✕
              </button>
            </div>

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
                    onClick={() => startRecording(mode!)}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[var(--color-primary-hover)]"
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
                  <p className="max-w-sm text-sm text-[var(--color-text)]">
                    {transcript}
                    <span className="text-[var(--color-text-muted)]">{interim}</span>
                  </p>
                )}
                {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
              </div>
            )}

            {stage === "processing" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Diktat wird verarbeitet …</p>}

            {stage === "queued" && (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">Kein Netz erreichbar.</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Das Diktat wurde auf dem Gerät zwischengespeichert und wird automatisch geprüft, sobald wieder eine Verbindung besteht.
                </p>
                <button onClick={resetAll} className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white">
                  OK
                </button>
              </div>
            )}

            {stage === "review" && mode === "leistung" && leistungReview && (
              <LeistungReviewForm review={leistungReview} cases={cases} onChange={setLeistungReview} onConfirm={confirmLeistung} error={error} />
            )}
            {stage === "review" && mode === "zeit" && zeitReview && (
              <ZeitReviewForm review={zeitReview} cases={cases} onChange={setZeitReview} onConfirm={confirmZeit} error={error} />
            )}

            {stage === "saving" && <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Wird gespeichert …</p>}
            {stage === "done" && <p className="py-8 text-center text-sm font-medium text-[var(--color-primary)]">✓ Übernommen.</p>}
          </div>
        </div>
      )}
    </>
  );
}

function LeistungReviewForm({
  review,
  cases,
  onChange,
  onConfirm,
  error,
}: {
  review: LeistungReview;
  cases: GlobalDictateCaseOption[];
  onChange: (r: LeistungReview) => void;
  onConfirm: () => void;
  error: string | null;
}) {
  const candidateIds = new Set(review.candidates.map((c) => c.caseId));
  const otherOptions = cases.filter((c) => !candidateIds.has(c.id));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--color-text-muted)]">Erkannt: „{review.clientNameHeard}&quot; – bitte prüfen.</p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Fall</span>
        <select value={review.caseId} onChange={(e) => onChange({ ...review, caseId: e.target.value })} className={inputCls}>
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
            {otherOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName} ({c.helpTypeName})
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
          <input type="date" value={review.date} onChange={(e) => onChange({ ...review, date: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
          <input type="time" value={review.startTime} onChange={(e) => onChange({ ...review, startTime: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
          <input type="time" value={review.endTime} onChange={(e) => onChange({ ...review, endTime: e.target.value })} className={inputCls} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bemerkungstext</span>
        <textarea rows={4} value={review.description} onChange={(e) => onChange({ ...review, description: e.target.value })} className={inputCls} />
      </label>
      {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
      <button
        onClick={onConfirm}
        disabled={!review.caseId}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Übernehmen
      </button>
    </div>
  );
}

function ZeitReviewForm({
  review,
  cases,
  onChange,
  onConfirm,
  error,
}: {
  review: ZeitReview;
  cases: GlobalDictateCaseOption[];
  onChange: (r: ZeitReview) => void;
  onConfirm: () => void;
  error: string | null;
}) {
  const candidateIds = new Set(review.candidates.map((c) => c.caseId));
  const otherOptions = cases.filter((c) => !candidateIds.has(c.id));
  return (
    <div className="flex flex-col gap-3">
      {review.clientNameHeard && <p className="text-xs text-[var(--color-text-muted)]">Erkannt: „{review.clientNameHeard}&quot; – bitte prüfen.</p>}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={review.assignmentType === "general"} onChange={() => onChange({ ...review, assignmentType: "general" })} />
          Allgemeine Tätigkeit
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={review.assignmentType === "case"} onChange={() => onChange({ ...review, assignmentType: "case" })} />
          Fall
        </label>
      </div>
      {review.assignmentType === "general" ? (
        <select
          value={review.generalActivity}
          onChange={(e) => onChange({ ...review, generalActivity: e.target.value as ZeitReview["generalActivity"] })}
          className={inputCls}
        >
          <option value="VERWALTUNG">Verwaltung</option>
          <option value="FAHRZEITEN">Fahrzeiten</option>
          <option value="SONSTIGES">Sonstiges</option>
        </select>
      ) : (
        <select value={review.caseId} onChange={(e) => onChange({ ...review, caseId: e.target.value })} className={inputCls}>
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
            {otherOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName} ({c.helpTypeName})
              </option>
            ))}
          </optgroup>
        </select>
      )}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Datum</span>
          <input type="date" value={review.date} onChange={(e) => onChange({ ...review, date: e.target.value })} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Stunden</span>
          <input value={review.durationHours} onChange={(e) => onChange({ ...review, durationHours: e.target.value })} className={inputCls} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Notiz</span>
        <textarea rows={3} value={review.note} onChange={(e) => onChange({ ...review, note: e.target.value })} className={inputCls} />
      </label>
      {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
      <button
        onClick={onConfirm}
        disabled={review.assignmentType === "case" && !review.caseId}
        className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        Übernehmen
      </button>
    </div>
  );
}
