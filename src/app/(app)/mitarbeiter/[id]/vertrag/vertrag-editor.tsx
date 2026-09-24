"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { computeStundenmodell, type SondertagWithMeta, type SondertagRow } from "@/lib/stundenmodell";
import { savePlan, saveVertrag, saveFahrtenrechnerProfil, type ActionState, type WochenplanEntry } from "./actions";
import { ProsSectionCard } from "@/components/pros/pros-card";
import { ProsStatusPill } from "@/components/pros/pros-status-pill";
import { inputCls, labelCls, buttonOutlineCls, buttonPrimaryCls, buttonSecondaryCls } from "@/app/(app)/cases/case-ui";
import { IconWarnTriangle } from "@/app/(app)/cases/case-icons";

export type VertragEmployee = {
  id: string;
  name: string;
  wochenstunden: number | null;
  tageProWoche: number | null;
  eintrittsdatum: string | null;
  fondsBasisAtHire: number | null;
  tvoedStufe: string | null;
  allowedHelpTypeIds: string[];
  currentPlanGueltigAb: string | null;
  wochenplan: WochenplanEntry[];
  sondertagIds: string[];
  ampel: "gruen" | "gelb" | "rot";
  wohnortAdresse: string | null;
  primaerStandort: "NITTENDORF" | "REGENSBURG";
  einsatzradiusKm: number;
  zielFlsStdWocheManuell: number | null;
};

const AMPEL_TONE: Record<string, "active" | "attention" | "critical"> = { gruen: "active", gelb: "attention", rot: "critical" };
const AMPEL_LABEL: Record<string, string> = { gruen: "Grün", gelb: "Gelb", rot: "Rot" };
const WOCHENTAG_NAMEN = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addHoursToTime(start: string, hours: number): string {
  const [h, m] = start.split(":").map(Number);
  const totalMin = h * 60 + m + Math.round(hours * 60);
  const eh = Math.floor(totalMin / 60) % 24;
  const em = totalMin % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function defaultWochenplan(tageProWoche: number, stdProTag: number): WochenplanEntry[] {
  return Array.from({ length: tageProWoche }, (_, i) => ({ day: i + 1, start: "08:00", end: addHoursToTime("08:00", stdProTag) }));
}

export function VertragEditor({
  employee,
  sondertage,
  helpTypes,
  aktuelleFondsBasis,
}: {
  employee: VertragEmployee;
  sondertage: SondertagRow[];
  helpTypes: { id: string; name: string }[];
  aktuelleFondsBasis: number;
}) {
  const [profileState, profileAction, profilePending] = useActionState<ActionState, FormData>(saveVertrag, undefined);
  const [planState, planAction, planPending] = useActionState<ActionState, FormData>(savePlan, undefined);
  const [fahrtenState, fahrtenAction, fahrtenPending] = useActionState<ActionState, FormData>(saveFahrtenrechnerProfil, undefined);

  const [wochenstunden, setWochenstunden] = useState(employee.wochenstunden ?? 30);
  const [tageProWoche, setTageProWoche] = useState<4 | 5>((employee.tageProWoche as 4 | 5) ?? 5);
  const [eintrittsdatum, setEintrittsdatum] = useState(employee.eintrittsdatum ?? "");
  const [selectedSondertagIds, setSelectedSondertagIds] = useState<Set<string>>(new Set(employee.sondertagIds));
  const [wochenplan, setWochenplan] = useState<WochenplanEntry[]>(
    employee.wochenplan.length > 0 ? employee.wochenplan : defaultWochenplan(tageProWoche, wochenstunden / tageProWoche)
  );
  const [gueltigAb, setGueltigAb] = useState(toDateInputValue(new Date()));

  const effectiveFondsBasis = employee.fondsBasisAtHire ?? aktuelleFondsBasis;

  const sondertageForCalc: SondertagWithMeta[] = useMemo(
    () =>
      sondertage
        .filter((s) => selectedSondertagIds.has(s.id))
        .map((s) => ({ id: s.id, name: s.name, datum: new Date(s.datum), dauerStd: s.dauerStd, istEchterExtraTag: s.istEchterExtraTag })),
    [sondertage, selectedSondertagIds]
  );

  const betrachtungsjahr = eintrittsdatum ? new Date(eintrittsdatum).getUTCFullYear() : undefined;

  const result = useMemo(
    () =>
      computeStundenmodell({
        wochenstunden,
        tageProWoche,
        aktuelleFondsBasis: effectiveFondsBasis,
        eintrittsdatum: eintrittsdatum ? new Date(eintrittsdatum) : null,
        betrachtungsjahr,
        sondertage: sondertageForCalc,
      }),
    [wochenstunden, tageProWoche, effectiveFondsBasis, eintrittsdatum, betrachtungsjahr, sondertageForCalc]
  );

  function toggleTageProWoche(next: 4 | 5) {
    setTageProWoche(next);
    setWochenplan(defaultWochenplan(next, wochenstunden / next));
  }

  function updateWochenplanRow(index: number, field: "start" | "end", value: string) {
    setWochenplan((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="flex flex-col gap-6">
      <ProsSectionCard
        title="Vertragsdaten"
        action={<ProsStatusPill tone={AMPEL_TONE[result.ampel]}>{AMPEL_LABEL[result.ampel]}</ProsStatusPill>}
      >
        <form action={profileAction} className="flex flex-col gap-4">
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Wochenstunden</span>
              <input
                name="wochenstunden"
                type="number"
                min="1"
                step="0.5"
                value={wochenstunden}
                onChange={(e) => setWochenstunden(Number(e.target.value) || 0)}
                className={`w-28 ${inputCls}`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Tage/Woche</span>
              <select name="tageProWoche" value={tageProWoche} onChange={(e) => toggleTageProWoche(Number(e.target.value) as 4 | 5)} className={inputCls}>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Eintrittsdatum</span>
              <input name="eintrittsdatum" type="date" value={eintrittsdatum} onChange={(e) => setEintrittsdatum(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>TVöD-Stufe</span>
              <input name="tvoedStufe" defaultValue={employee.tvoedStufe ?? ""} placeholder="z.B. S8b Stufe 3" className={`w-40 ${inputCls}`} />
            </label>
          </div>

          <div>
            <span className={labelCls}>Darf folgende Hilfearten bearbeiten</span>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {helpTypes.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input type="checkbox" name="allowedHelpTypeIds" value={h.id} defaultChecked={employee.allowedHelpTypeIds.includes(h.id)} />
                  {h.name}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={profilePending} className={`self-start ${buttonOutlineCls}`}>
            {profilePending ? "Speichern…" : "Vertragsdaten speichern"}
          </button>
        </form>
        {profileState?.error && <p className="mt-2 text-sm text-[var(--pros-status-critical-text)]">{profileState.error}</p>}
        {profileState?.success && <p className="mt-2 text-sm text-[var(--pros-status-active-text)]">{profileState.success}</p>}
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Fonds-Basis für diesen Mitarbeiter: <strong>{effectiveFondsBasis.toFixed(2)}%</strong>
          {employee.fondsBasisAtHire != null
            ? " (eingefroren bei Einstellung)"
            : " (noch kein Snapshot – wird beim ersten Speichern übernommen)"}
          {aktuelleFondsBasis !== effectiveFondsBasis && ` · aktuelle Praxis-Basis: ${aktuelleFondsBasis.toFixed(2)}%`}
        </p>
      </ProsSectionCard>

      <ProsSectionCard title="Fahrten-/Fallrechner-Profil">
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Referenzpunkt für Fahrzeit-Schätzungen — Wohnort, falls hinterlegt, sonst der primäre Standort.
        </p>
        <form action={fahrtenAction} className="flex flex-col gap-4">
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Wohnort-Adresse (optional)</span>
              <input name="wohnortAdresse" defaultValue={employee.wohnortAdresse ?? ""} placeholder="Straße Hausnr., PLZ Ort" className={`w-64 ${inputCls}`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Primärer Standort</span>
              <select name="primaerStandort" defaultValue={employee.primaerStandort} className={inputCls}>
                <option value="NITTENDORF">Nittendorf</option>
                <option value="REGENSBURG">Regensburg</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Einsatzradius (km)</span>
              <input name="einsatzradiusKm" type="number" min="1" step="0.5" defaultValue={employee.einsatzradiusKm} className={`w-28 ${inputCls}`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Ziel-FLS-Std./Woche (manuell)</span>
              <input
                name="zielFlsStdWocheManuell"
                type="number"
                min="0"
                step="0.5"
                defaultValue={employee.zielFlsStdWocheManuell ?? ""}
                placeholder="z.B. 22.5"
                className={`w-36 ${inputCls}`}
              />
            </label>
          </div>
          <button type="submit" disabled={fahrtenPending} className={`self-start ${buttonOutlineCls}`}>
            {fahrtenPending ? "Speichern…" : "Fahrtenrechner-Profil speichern"}
          </button>
          {fahrtenState?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{fahrtenState.error}</p>}
          {fahrtenState?.success && <p className="text-sm text-[var(--pros-status-active-text)]">{fahrtenState.success}</p>}
        </form>
      </ProsSectionCard>

      <ProsSectionCard title="Stundenmodell-Ergebnis">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Std./Tag" value={result.stdProTag.toFixed(2)} />
          <Stat label="Fonds-Tage" value={result.fondsTageValue.toFixed(2)} />
          <Stat label="Vorarbeit (Tage)" value={result.vorarbeitTageValue.toFixed(2)} />
          <Stat label="Vorarbeit (Std.)" value={result.vorarbeitStdValue.toFixed(2)} />
          <Stat label="Überschuss Sondertage" value={result.summeUeberschuss.toFixed(2)} />
          <Stat label="Rest (Std.)" value={result.restStdValue.toFixed(2)} />
          <Stat label="Rest (Min./Tag)" value={result.restMinProTagValue.toFixed(1)} />
          {result.anteilsfaktorValue != null && <Stat label="Anteilsfaktor" value={result.anteilsfaktorValue.toFixed(2)} />}
        </div>

        {result.warnings.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {result.warnings.map((w, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-[var(--pros-r-sm)] px-3.5 py-2.5 text-sm ${
                  w.level === "rot" ? "bg-[var(--pros-status-critical-bg)] text-[var(--pros-status-critical-text)]" : "bg-[var(--pros-status-attention-bg)] text-[var(--pros-status-attention-text)]"
                }`}
              >
                <IconWarnTriangle />
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </ProsSectionCard>

      <ProsSectionCard title="Sondertage zuordnen">
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">Live-Neuberechnung bei jeder Änderung.</p>
        <div className="flex flex-col gap-2">
          {sondertage.map((s) => (
            <label key={s.id} className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={selectedSondertagIds.has(s.id)}
                onChange={(e) =>
                  setSelectedSondertagIds((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    return next;
                  })
                }
              />
              {s.name} · {new Date(s.datum).toLocaleDateString("de-DE")} · {s.dauerStd.toFixed(2)} Std. ·{" "}
              {s.istEchterExtraTag ? "echter Extra-Tag" : "verlängerter Normaltag"}
            </label>
          ))}
          {sondertage.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">Noch keine Sondertage im Katalog (unter Team-Gesamtansicht anlegbar).</p>
          )}
        </div>
      </ProsSectionCard>

      <ProsSectionCard title="Wochenplan-Vorschlag">
        <form action={planAction} className="flex flex-col gap-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="wochenplan" value={JSON.stringify(wochenplan)} />
          {selectedSondertagIds.size > 0 &&
            Array.from(selectedSondertagIds).map((id) => <input key={id} type="hidden" name="sondertagIds" value={id} />)}

          <div className="overflow-x-auto rounded-[var(--pros-r-sm)] border border-[var(--pros-border-strong)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-primary-soft)] text-[11px] font-bold tracking-wide text-[var(--color-primary)] uppercase">
                <tr>
                  <th className="px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Von</th>
                  <th className="px-3 py-2">Bis</th>
                </tr>
              </thead>
              <tbody>
                {wochenplan.map((row, i) => (
                  <tr key={row.day} className="border-t border-[var(--pros-border-default)]">
                    <td className="px-3 py-2 text-[var(--color-text)]">{WOCHENTAG_NAMEN[row.day - 1]}</td>
                    <td className="px-3 py-2">
                      <input type="time" value={row.start} onChange={(e) => updateWochenplanRow(i, "start", e.target.value)} className={inputCls} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="time" value={row.end} onChange={(e) => updateWochenplanRow(i, "end", e.target.value)} className={inputCls} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Gültig ab (neue Plan-Version)</span>
              <input name="gueltigAb" type="date" value={gueltigAb} onChange={(e) => setGueltigAb(e.target.value)} className={inputCls} />
            </label>
            <button type="submit" disabled={planPending} className={buttonPrimaryCls}>
              {planPending ? "Speichern…" : "Anpassen ab jetzt"}
            </button>
            <a href={`/api/admin/stundenmodell/${employee.id}/pdf`} target="_blank" rel="noopener noreferrer" className={buttonSecondaryCls}>
              Als PDF exportieren
            </a>
          </div>
          {planState?.error && <p className="text-sm text-[var(--pros-status-critical-text)]">{planState.error}</p>}
          {planState?.success && <p className="text-sm text-[var(--pros-status-active-text)]">{planState.success}</p>}
          {employee.currentPlanGueltigAb && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Aktuell gespeicherte Version gültig ab {new Date(employee.currentPlanGueltigAb).toLocaleDateString("de-DE")}. Der PDF-Export
              bezieht sich auf die zuletzt gespeicherte Version, nicht auf unsichere Änderungen hier oben.
            </p>
          )}
        </form>
      </ProsSectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-[var(--color-text)]">{value}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}
