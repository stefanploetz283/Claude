"use client";

import { useActionState, useState, useTransition } from "react";
import { createVorlage, updateVorlage, toggleVorlageAktiv, generiereSlotsJetzt, type VorlageActionState } from "./wochenvorlagen-actions";
import { WOCHENTAG_LABEL } from "@/lib/termine/labels";

const inputCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)]";

type Mitarbeiterin = { id: string; name: string };
type Raum = { id: string; name: string };
type Vorlage = {
  id: string;
  employeeId: string;
  label: string | null;
  wochentag: number;
  startZeit: string;
  endZeit: string;
  slotDauerMinuten: number;
  raumId: string | null;
  aktiv: boolean;
};

function VorlageFelder({ raeume, defaults }: { raeume: Raum[]; defaults?: Partial<Vorlage> }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bezeichnung</span>
        <input name="label" defaultValue={defaults?.label ?? ""} placeholder="z.B. Praxisnachmittag" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Wochentag</span>
        <select name="wochentag" defaultValue={defaults?.wochentag ?? 1} className={inputCls}>
          {Object.entries(WOCHENTAG_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Von</span>
        <input name="startZeit" type="time" defaultValue={defaults?.startZeit ?? "13:30"} required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bis</span>
        <input name="endZeit" type="time" defaultValue={defaults?.endZeit ?? "18:00"} required className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Slot-Dauer</span>
        <select name="slotDauerMinuten" defaultValue={defaults?.slotDauerMinuten ?? 60} className={inputCls}>
          <option value={60}>60 Min.</option>
          <option value={90}>90 Min.</option>
          <option value={120}>120 Min.</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Standard-Raum</span>
        <select name="raumId" defaultValue={defaults?.raumId ?? ""} className={inputCls}>
          <option value="">Kein Standard-Raum</option>
          {raeume.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function WochenvorlagenVerwaltung({ mitarbeiterinnen, raeume, vorlagen }: { mitarbeiterinnen: Mitarbeiterin[]; raeume: Raum[]; vorlagen: Vorlage[] }) {
  const [createState, createAction, createPending] = useActionState<VorlageActionState, FormData>(createVorlage, undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [genPending, startGen] = useTransition();
  const [genResult, setGenResult] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Neue Wochenvorlage</h2>
        <form action={createAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Mitarbeiterin</span>
            <select name="employeeId" required className={inputCls}>
              <option value="">Bitte wählen…</option>
              {mitarbeiterinnen.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <VorlageFelder raeume={raeume} />
          <button
            type="submit"
            disabled={createPending}
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            Anlegen
          </button>
          {createState?.error && <p className="w-full text-sm text-[var(--color-coral)]">{createState.error}</p>}
        </form>
      </div>

      {mitarbeiterinnen.map((m) => {
        const eigene = vorlagen.filter((v) => v.employeeId === m.id);
        if (eigene.length === 0) return null;
        return (
          <div key={m.id} className={cardCls}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">{m.name}</h3>
              <button
                disabled={genPending}
                onClick={() =>
                  startGen(async () => {
                    const r = await generiereSlotsJetzt(m.id);
                    setGenResult(`${m.name}: ${r.erstellt} neue Slot(s) erzeugt.`);
                  })
                }
                className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
              >
                Slots jetzt generieren
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {eigene.map((v) =>
                editingId === v.id ? (
                  <form
                    key={v.id}
                    action={(fd) => {
                      updateVorlage(undefined, fd);
                      setEditingId(null);
                    }}
                    className="flex flex-wrap items-end gap-3 rounded-[var(--radius-control)] bg-[var(--color-bg)] p-3"
                  >
                    <input type="hidden" name="id" value={v.id} />
                    <VorlageFelder raeume={raeume} defaults={v} />
                    <button type="submit" className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
                      Speichern
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-sm font-medium text-[var(--color-text-muted)] hover:underline">
                      Abbrechen
                    </button>
                  </form>
                ) : (
                  <div key={v.id} className={`flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm ${!v.aktiv ? "opacity-50" : ""}`}>
                    <span className="text-[var(--color-text)]">
                      {v.label ? `${v.label} · ` : ""}
                      {WOCHENTAG_LABEL[v.wochentag]} {v.startZeit}–{v.endZeit} · {v.slotDauerMinuten} Min./Slot
                      {!v.aktiv && " · deaktiviert"}
                    </span>
                    <span className="flex gap-3">
                      <button onClick={() => setEditingId(v.id)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                        Bearbeiten
                      </button>
                      <button onClick={() => toggleVorlageAktiv(v.id, !v.aktiv)} className="text-xs font-medium text-[var(--color-text-muted)] hover:underline">
                        {v.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
      {genResult && <p className="text-sm text-[var(--color-primary)]">{genResult}</p>}
      {vorlagen.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Noch keine Wochenvorlagen angelegt.</p>}
    </div>
  );
}
