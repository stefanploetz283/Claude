"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBerichtsbaustein, suggestBerichtsbausteinKategorie } from "./actions";
import { BERICHTS_KAPITEL_ORDER, BERICHTS_KAPITEL_INFO } from "@/lib/berichtsbausteine/manual";
import type { BerichtsKapitel } from "@prisma/client";

type BausteinOption = { id: string; kurzbezeichnung: string };

// Dieselbe Browser-Spracherkennungs-Anbindung wie in voice-entry-flow.tsx (Mikrofon-Diktat für die
// reguläre Leistungsdokumentation) - hier bewusst eigenständig gehalten statt geteilt importiert, um die
// bereits produktive Diktier-Pipeline dort nicht durch einen Umbau zu gefährden.
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

const RECOVERABLE_RECOGNITION_ERRORS = new Set(["no-speech", "aborted"]);

type Stage = "eingabe" | "verarbeitung" | "pruefung" | "gespeichert";

const inputCls =
  "w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

export function BerichtsbausteinCapture({
  caseId,
  triadeOptionen,
  letzteBausteine,
}: {
  caseId: string;
  triadeOptionen: string[];
  letzteBausteine: BausteinOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("eingabe");
  const [modus, setModus] = useState<"diktat" | "freitext">("freitext");
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [freitext, setFreitext] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [kategorie, setKategorie] = useState<BerichtsKapitel | "">("");
  const [bezugBausteinId, setBezugBausteinId] = useState("");
  const [triadeZuordnung, setTriadeZuordnung] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const stopRequestedRef = useRef(false);
  const finalTextRef = useRef("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const runKategorisierung = useCallback(
    async (value: string) => {
      setStage("verarbeitung");
      setError(null);
      const result = await suggestBerichtsbausteinKategorie(caseId, value);
      setText(value);
      setKategorie(result.ok && result.kategorie ? result.kategorie : "");
      setStage("pruefung");
    },
    [caseId]
  );

  function beginSession() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setSupported(false);
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
      setRecording(false);
    };
    recognition.onend = () => {
      if (hasErrored) return;
      if (!stopRequestedRef.current) {
        beginSession();
        return;
      }
      setRecording(false);
      const value = finalTextRef.current.trim();
      if (value) {
        runKategorisierung(value);
      } else {
        setError("Es wurde nichts erkannt. Bitte erneut versuchen.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function startRecording() {
    if (!getSpeechRecognition()) {
      setSupported(false);
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");
    finalTextRef.current = "";
    stopRequestedRef.current = false;
    setRecording(true);
    beginSession();
  }

  function stopRecording() {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  }

  function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("caseId", caseId);
    formData.set("originaltext", text.trim());
    if (kategorie) formData.set("vorlaeufigeKategorie", kategorie);
    if (bezugBausteinId) formData.set("bezugBausteinId", bezugBausteinId);
    for (const t of triadeZuordnung) formData.append("triadeZuordnung", t);

    createBerichtsbaustein(undefined, formData).then((result) => {
      setSaving(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setStage("gespeichert");
      router.refresh();
    });
  }

  function reset() {
    setOpen(false);
    setStage("eingabe");
    setModus("freitext");
    setFreitext("");
    setTranscript("");
    setInterim("");
    setText("");
    setKategorie("");
    setBezugBausteinId("");
    setTriadeZuordnung([]);
    setError(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)]"
      >
        + Baustein erfassen
      </button>
    );
  }

  return (
    <div className={cardCls}>
      {stage === "gespeichert" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-text)]">Baustein gespeichert.</p>
          <button
            onClick={reset}
            className="self-start rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
          >
            Weiteren Baustein erfassen
          </button>
        </div>
      ) : stage === "pruefung" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Vorläufige Kategorie und Zuordnung bitte prüfen - der Text lässt sich hier noch korrigieren, danach bleibt er als Beleg
            unverändert bestehen.
          </p>
          <Field label="Text">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className={inputCls} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Vorläufige Kategorie (unverbindlich)">
              <select value={kategorie} onChange={(e) => setKategorie(e.target.value as BerichtsKapitel | "")} className={`min-w-[16rem] ${inputCls}`}>
                <option value="">– keine Angabe –</option>
                {BERICHTS_KAPITEL_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {BERICHTS_KAPITEL_INFO[k].label} ({BERICHTS_KAPITEL_INFO[k].hauptkapitel})
                  </option>
                ))}
              </select>
            </Field>
            {letzteBausteine.length > 0 && (
              <Field label="Bezieht sich auf... (optional)">
                <select value={bezugBausteinId} onChange={(e) => setBezugBausteinId(e.target.value)} className={`min-w-[16rem] ${inputCls}`}>
                  <option value="">– keiner –</option>
                  {letzteBausteine.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kurzbezeichnung}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {triadeOptionen.length > 0 && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">Triade-Zuordnung (optional)</span>
              <div className="flex flex-wrap gap-3">
                {triadeOptionen.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={triadeZuordnung.includes(t)}
                      onChange={(e) =>
                        setTriadeZuordnung((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !text.trim()}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Baustein speichern"}
            </button>
            <button onClick={reset} className="rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)]">
              Abbrechen
            </button>
          </div>
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1 rounded-[var(--radius-control)] bg-[var(--color-bg)] p-1 text-sm">
            <button
              onClick={() => setModus("freitext")}
              className={`flex-1 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 font-medium transition ${
                modus === "freitext" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              Freitext
            </button>
            <button
              onClick={() => setModus("diktat")}
              className={`flex-1 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 font-medium transition ${
                modus === "diktat" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              Mikrofon-Diktat
            </button>
          </div>

          {modus === "freitext" ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={freitext}
                onChange={(e) => setFreitext(e.target.value)}
                rows={5}
                placeholder="Text direkt eintippen..."
                className={inputCls}
              />
              <button
                onClick={() => runKategorisierung(freitext)}
                disabled={!freitext.trim() || stage === "verarbeitung"}
                className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {stage === "verarbeitung" ? "Wird eingeordnet…" : "Weiter"}
              </button>
            </div>
          ) : !supported ? (
            <p className="text-sm text-[var(--color-text)]">
              Dein Browser unterstützt keine Spracherkennung. Bitte verwende Chrome oder Edge, oder erfasse den Baustein als Freitext.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              {recording ? (
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
                  disabled={stage === "verarbeitung"}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  aria-label="Aufnahme starten"
                >
                  <MicIcon />
                </button>
              )}
              <p className="text-sm text-[var(--color-text-muted)]">
                {recording && "Aufnahme läuft ... zum Beenden klicken."}
                {stage === "verarbeitung" && "Baustein wird eingeordnet ..."}
                {!recording && stage !== "verarbeitung" && "Klicke zum Diktieren."}
              </p>
              {(transcript || interim) && recording && (
                <p className="max-w-xl text-sm text-[var(--color-text)]">
                  {transcript}
                  <span className="text-[var(--color-text-muted)]">{interim}</span>
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
          <button onClick={reset} className="self-start text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
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
