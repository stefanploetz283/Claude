"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { computeStundenmodell, type SondertagWithMeta } from "@/lib/stundenmodell";
import { savePlan, saveProfile, type ActionState, type WochenplanEntry } from "./actions";
import type { SondertagRow } from "./sondertag-catalog";

export type EmployeeData = {
  id: string;
  name: string;
  wochenstunden: number | null;
  tageProWoche: number | null;
  eintrittsdatum: string | null;
  fondsBasisAtHire: number | null;
  currentPlanGueltigAb: string | null;
  wochenplan: WochenplanEntry[];
  sondertagIds: string[];
  ampel: "gruen" | "gelb" | "rot";
};

const AMPEL_COLOR: Record<string, string> = { gruen: "var(--color-primary)", gelb: "var(--color-gold)", rot: "var(--color-coral)" };
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

export function StundenmodellBoard({
  employees,
  sondertage,
  aktuelleFondsBasis,
}: {
  employees: EmployeeData[];
  sondertage: SondertagRow[];
  aktuelleFondsBasis: number;
}) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id ?? null);
  const selected = employees.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Mitarbeiter</h2>
        <ul className="flex flex-col gap-1">
          {employees.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setSelectedId(e.id)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm transition ${
                  e.id === selectedId ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]" : "hover:bg-[var(--color-bg)]"
                }`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AMPEL_COLOR[e.ampel] }} />
                {e.name}
              </button>
            </li>
          ))}
          {employees.length === 0 && <li className="text-sm text-[var(--color-text-muted)]">Keine aktiven Fachkräfte.</li>}
        </ul>
      </div>

      {selected ? (
        <EmployeeEditor key={selected.id} employee={selected} sondertage={sondertage} aktuelleFondsBasis={aktuelleFondsBasis} />
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Bitte einen Mitarbeiter auswählen.</p>
      )}
    </div>
  );
}

function EmployeeEditor({
  employee,
  sondertage,
  aktuelleFondsBasis,
}: {
  employee: EmployeeData;
  sondertage: SondertagRow[];
  aktuelleFondsBasis: number;
}) {
  const [profileState, profileAction, profilePending] = useActionState<ActionState, FormData>(saveProfile, undefined);
  const [planState, planAction, planPending] = useActionState<ActionState, FormData>(savePlan, undefined);

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
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{employee.name} · Profil</h2>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: AMPEL_COLOR[result.ampel] }}
          >
            {AMPEL_LABEL[result.ampel]}
          </span>
        </div>

        <form action={profileAction} className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="employeeId" value={employee.id} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Wochenstunden</span>
            <input
              name="wochenstunden"
              type="number"
              min="1"
              step="0.5"
              value={wochenstunden}
              onChange={(e) => setWochenstunden(Number(e.target.value) || 0)}
              className="w-28 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Tage/Woche</span>
            <select
              name="tageProWoche"
              value={tageProWoche}
              onChange={(e) => toggleTageProWoche(Number(e.target.value) as 4 | 5)}
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
            >
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Eintrittsdatum</span>
            <input
              name="eintrittsdatum"
              type="date"
              value={eintrittsdatum}
              onChange={(e) => setEintrittsdatum(e.target.value)}
              className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
            />
          </label>
          <button
            type="submit"
            disabled={profilePending}
            className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
          >
            {profilePending ? "Speichern…" : "Profil speichern"}
          </button>
        </form>
        {profileState?.error && <p className="mt-2 text-sm text-[var(--color-coral)]">{profileState.error}</p>}
        {profileState?.success && <p className="mt-2 text-sm text-[var(--color-green-medium)]">{profileState.success}</p>}
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Fonds-Basis für diesen Mitarbeiter: <strong>{effectiveFondsBasis.toFixed(2)}%</strong>
          {employee.fondsBasisAtHire != null
            ? " (eingefroren bei Einstellung)"
            : " (noch kein Snapshot – wird beim ersten Speichern übernommen)"}
          {aktuelleFondsBasis !== effectiveFondsBasis && ` · aktuelle Praxis-Basis: ${aktuelleFondsBasis.toFixed(2)}%`}
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Ergebnis</h2>
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
                className={`rounded-[var(--radius-control)] px-3.5 py-2.5 text-sm ${
                  w.level === "rot" ? "bg-[var(--color-coral)]/10 text-[var(--color-text)]" : "bg-[var(--color-warn-soft)] text-[var(--color-warn-text)]"
                }`}
              >
                {w.level === "rot" ? "⚠ " : "⚡ "}
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Sondertage zuordnen</h2>
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
          {sondertage.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Sondertage im Katalog.</p>}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Wochenplan-Vorschlag</h2>
        <form action={planAction} className="flex flex-col gap-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <input type="hidden" name="wochenplan" value={JSON.stringify(wochenplan)} />
          {selectedSondertagIds.size > 0 &&
            Array.from(selectedSondertagIds).map((id) => <input key={id} type="hidden" name="sondertagIds" value={id} />)}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-primary-soft)] text-xs uppercase text-[var(--color-primary)]">
                <tr>
                  <th className="px-3 py-2">Tag</th>
                  <th className="px-3 py-2">Von</th>
                  <th className="px-3 py-2">Bis</th>
                </tr>
              </thead>
              <tbody>
                {wochenplan.map((row, i) => (
                  <tr key={row.day} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 text-[var(--color-text)]">{WOCHENTAG_NAMEN[row.day - 1]}</td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.start}
                        onChange={(e) => updateWochenplanRow(i, "start", e.target.value)}
                        className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.end}
                        onChange={(e) => updateWochenplanRow(i, "end", e.target.value)}
                        className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Gültig ab (neue Plan-Version)</span>
              <input
                name="gueltigAb"
                type="date"
                value={gueltigAb}
                onChange={(e) => setGueltigAb(e.target.value)}
                className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-sm text-[var(--color-text)]"
              />
            </label>
            <button
              type="submit"
              disabled={planPending}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {planPending ? "Speichern…" : "Anpassen ab jetzt"}
            </button>
            <a
              href={`/api/admin/stundenmodell/${employee.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-control)] border border-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
            >
              Als PDF exportieren
            </a>
          </div>
          {planState?.error && <p className="text-sm text-[var(--color-coral)]">{planState.error}</p>}
          {planState?.success && <p className="text-sm text-[var(--color-green-medium)]">{planState.success}</p>}
          {employee.currentPlanGueltigAb && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Aktuell gespeicherte Version gültig ab {new Date(employee.currentPlanGueltigAb).toLocaleDateString("de-DE")}. Der PDF-Export
              bezieht sich auf die zuletzt gespeicherte Version, nicht auf unsichere Änderungen hier oben.
            </p>
          )}
        </form>
      </div>
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
