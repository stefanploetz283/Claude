"use client";

import { useActionState, useState, useTransition } from "react";
import { addVorsorgeaufwandEintrag, deleteVorsorgeaufwandEintrag, updateSteuereinstellungen, type ActionState } from "./steuer-actions";
import { toDateInputValue } from "@/lib/date";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const labelCls = "text-xs font-medium text-[var(--color-text-muted)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

const VORSORGE_ARTEN = [
  { value: "RUERUP_RENTE", label: "Rürup-Rente" },
  { value: "KRANKENVERSICHERUNG", label: "Krankenversicherung" },
  { value: "SONSTIGE", label: "Sonstige absetzbare Posten" },
];

export type VorsorgeEintragRow = { id: string; art: string; betragMonatlich: number; gueltigAb: string };

export function SteuereinstellungenForm({
  vorsorgeEintraege,
  persoenlicherGrenzsteuersatz,
  veranlagungsart,
  ehepartnerEinkommenJahr,
}: {
  vorsorgeEintraege: VorsorgeEintragRow[];
  persoenlicherGrenzsteuersatz: number;
  veranlagungsart: string;
  ehepartnerEinkommenJahr: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [vorsorgeState, vorsorgeAction, vorsorgePending] = useActionState<ActionState, FormData>(addVorsorgeaufwandEintrag, undefined);
  const [einstellungenState, einstellungenAction, einstellungenPending] = useActionState<ActionState, FormData>(updateSteuereinstellungen, undefined);

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Steuereinstellungen &amp; Vorsorgeaufwendungen</h2>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
          {open ? "Ausblenden" : "Bearbeiten"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-6">
          <form action={einstellungenAction} className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Persönlicher Grenzsteuersatz &amp; Veranlagung</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Persönlicher Grenzsteuersatz (%)</span>
                <input name="persoenlicherGrenzsteuersatz" type="number" min="0" max="100" step="0.1" defaultValue={persoenlicherGrenzsteuersatz} required className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Veranlagungsart</span>
                <select name="veranlagungsart" defaultValue={veranlagungsart} className={inputCls}>
                  <option value="EINZELN">Einzelveranlagung</option>
                  <option value="ZUSAMMEN">Zusammenveranlagung (Ehegattensplitting)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Partnereinkommen/Jahr (€, optional, informativ)</span>
                <input name="ehepartnerEinkommenJahr" type="number" min="0" step="0.01" defaultValue={ehepartnerEinkommenJahr ?? ""} className={inputCls} />
              </label>
            </div>
            <p className="rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-xs text-[var(--color-text-muted)]">
              Bei Zusammenveranlagung sinkt der effektive Steuersatz durch den Splitting-Tarif spürbar. Der oben eingestellte
              Grenzsteuersatz sollte das bereits berücksichtigen — am zuverlässigsten über einen externen Splitting-Rechner (z. B. den
              offiziellen BMF-Steuerrechner) regelmäßig kalibrieren, nicht durch dieses Cockpit selbst berechnet.
            </p>
            <button
              type="submit"
              disabled={einstellungenPending}
              className="self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {einstellungenPending ? "Speichern…" : "Speichern"}
            </button>
            {einstellungenState?.error && <p className="text-sm text-[var(--color-coral)]">{einstellungenState.error}</p>}
            {einstellungenState?.success && <p className="text-sm text-[var(--color-green-medium)]">{einstellungenState.success}</p>}
          </form>

          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
              Vorsorgeaufwendungen (jeweils aktuellster Eintrag je Art zählt)
            </p>
            <div className="flex flex-col gap-2">
              {vorsorgeEintraege.map((e) => (
                <VorsorgeRow key={e.id} eintrag={e} />
              ))}
              {vorsorgeEintraege.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Einträge.</p>}
            </div>
            <form action={vorsorgeAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Art</span>
                <select name="art" required className={inputCls}>
                  {VORSORGE_ARTEN.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Betrag/Monat (€)</span>
                <input name="betragMonatlich" type="number" min="0" step="0.01" required className={`w-32 ${inputCls}`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelCls}>Gültig ab</span>
                <input name="gueltigAb" type="date" defaultValue={toDateInputValue(new Date())} required className={inputCls} />
              </label>
              <button
                type="submit"
                disabled={vorsorgePending}
                className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {vorsorgePending ? "Speichern…" : "Hinzufügen"}
              </button>
              {vorsorgeState?.error && <p className="w-full text-sm text-[var(--color-coral)]">{vorsorgeState.error}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VorsorgeRow({ eintrag }: { eintrag: VorsorgeEintragRow }) {
  const [pending, startTransition] = useTransition();
  const label = VORSORGE_ARTEN.find((a) => a.value === eintrag.art)?.label ?? eintrag.art;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-[var(--color-text)]">{label}</span>
      <span className="text-[var(--color-text-muted)]">
        {eintrag.betragMonatlich.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}/Monat · gültig ab{" "}
        {new Date(eintrag.gueltigAb).toLocaleDateString("de-DE")}
      </span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteVorsorgeaufwandEintrag(eintrag.id);
          })
        }
        className="text-xs font-medium text-[var(--color-coral)] hover:underline disabled:opacity-50"
      >
        Löschen
      </button>
    </div>
  );
}
