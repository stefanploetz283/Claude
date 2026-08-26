"use client";

import { useActionState, useState } from "react";
import { createPraxisKalkulationVersion, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";

export type KalkulationWerte = {
  gueltigAb: string;
  geplantePersonalkostenJahr: string;
  geplanteRaumkostenJahr: string;
  geplanteVerwaltungssachkostenJahr: string;
  geplanteSonstigeKostenAfaJahr: string;
  zielQuote: string;
  verfuegbarkeitsquote: string;
  zielFaktor: string;
  mindestFaktorSteuerberater: string;
  stundensatzBasis: string;
  zielFlsStdJahr: string;
  zahlungsverzugTageJugendamt: string;
  quelle: string;
} | null;

export function KalkulationForm({ aktuelleWerte }: { aktuelleWerte: KalkulationWerte }) {
  const [open, setOpen] = useState(aktuelleWerte == null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPraxisKalkulationVersion, undefined);

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Referenzwerte (Entgeltkalkulation)</h2>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
          {open ? "Ausblenden" : aktuelleWerte ? "Neue Version anlegen" : "Werte eintragen"}
        </button>
      </div>
      {!open && aktuelleWerte && (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Gültig ab {aktuelleWerte.gueltigAb} · Ziel-Quote {(Number(aktuelleWerte.zielQuote) * 100).toFixed(0)} % · Zielfaktor{" "}
          {aktuelleWerte.zielFaktor}
          {aktuelleWerte.quelle ? ` · ${aktuelleWerte.quelle}` : ""}
        </p>
      )}
      {open && (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            Legt eine neue Kalkulationsversion an - die bisherige bleibt als Historie erhalten, es wird nichts überschrieben.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Gültig ab</span>
              <input name="gueltigAb" type="date" defaultValue={aktuelleWerte?.gueltigAb ?? toDateInputValue(new Date())} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelCls}>Quelle (z.B. „Entgeltkalkulation Kommission 20260901&quot;)</span>
              <input name="quelle" defaultValue={aktuelleWerte?.quelle ?? ""} className={inputCls} />
            </label>
          </div>

          <p className="mt-1 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
            Geplante Kosten/Jahr (€)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Personalkosten</span>
              <input name="geplantePersonalkostenJahr" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.geplantePersonalkostenJahr ?? ""} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Raumkosten</span>
              <input name="geplanteRaumkostenJahr" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.geplanteRaumkostenJahr ?? ""} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Verwaltungssachkosten</span>
              <input name="geplanteVerwaltungssachkostenJahr" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.geplanteVerwaltungssachkostenJahr ?? ""} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Sonstige Kosten/AfA</span>
              <input name="geplanteSonstigeKostenAfaJahr" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.geplanteSonstigeKostenAfaJahr ?? ""} required className={inputCls} />
            </label>
          </div>

          <p className="mt-1 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Quoten &amp; Faktoren</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Ziel-Quote (Bruchzahl, z.B. 0.75)</span>
              <input name="zielQuote" type="number" min="0" max="2" step="0.001" defaultValue={aktuelleWerte?.zielQuote ?? "0.75"} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Verfügbarkeitsquote (200/260 = 0.769)</span>
              <input name="verfuegbarkeitsquote" type="number" min="0" max="2" step="0.001" defaultValue={aktuelleWerte?.verfuegbarkeitsquote ?? "0.769"} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Zielfaktor</span>
              <input name="zielFaktor" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.zielFaktor ?? "2.2"} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Mindestfaktor (Steuerberater)</span>
              <input name="mindestFaktorSteuerberater" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.mindestFaktorSteuerberater ?? "2.1"} required className={inputCls} />
            </label>
          </div>

          <p className="mt-1 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Sonstiges</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Stundensatz-Basis (€)</span>
              <input name="stundensatzBasis" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.stundensatzBasis ?? "110"} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Ziel-FLS-Std./Jahr</span>
              <input name="zielFlsStdJahr" type="number" min="0" step="0.01" defaultValue={aktuelleWerte?.zielFlsStdJahr ?? ""} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Zahlungsverzug Jugendamt (Tage)</span>
              <input name="zahlungsverzugTageJugendamt" type="number" min="0" step="1" defaultValue={aktuelleWerte?.zahlungsverzugTageJugendamt ?? "45"} required className={inputCls} />
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {pending ? "Speichern…" : "Neue Version speichern"}
          </button>
          {state?.error && <p className="text-sm text-[var(--color-coral)]">{state.error}</p>}
          {state?.success && <p className="text-sm text-[var(--color-green-medium)]">{state.success}</p>}
        </form>
      )}
    </div>
  );
}

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";
