"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  STANDORTE,
  haversineKm,
  estimatedDriveMinutesBetween,
  weeklyDriveMinutesFromMonthly,
  resultingFreeCapacity,
  type LatLng,
  type StandortKey,
} from "@/lib/fahrtenrechner/calc";
import { previewGeocode } from "./actions";
import type { EmployeeVM } from "./types";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]";
const inputCls = "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]";
const BEZEICHNUNG_VORSCHLAEGE_ID = "fahrtenrechner-bezeichnung-vorschlaege";

function caseIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function referenceIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function standortIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid var(--color-primary);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35))"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
  });
}

function assistentIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:var(--color-coral);transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

type Tab = "mitarbeiter" | "neuzuteilung";
type Empfehlungskategorie = "EMPFOHLEN" | "MOEGLICH" | "UEBERBUCHUNG";

const KATEGORIE_LABEL: Record<Empfehlungskategorie, string> = {
  EMPFOHLEN: "Empfohlen",
  MOEGLICH: "Möglich",
  UEBERBUCHUNG: "Überbuchung",
};
const KATEGORIE_CLS: Record<Empfehlungskategorie, string> = {
  EMPFOHLEN: "bg-[var(--color-primary)] text-white",
  MOEGLICH: "bg-[var(--color-border)] text-[var(--color-text)]",
  UEBERBUCHUNG: "bg-[var(--color-coral-soft)] text-[var(--color-coral)]",
};

let besuchsortEntwurfCounter = 0;
function neuerBesuchsortEntwurf(bezeichnung = ""): BesuchsortEntwurf {
  besuchsortEntwurfCounter++;
  return {
    localId: `entwurf-${besuchsortEntwurfCounter}`,
    bezeichnung,
    adresse: "",
    besucheProMonat: "4.33",
    pin: null,
    geocoding: false,
    error: null,
  };
}

type BesuchsortEntwurf = {
  localId: string;
  bezeichnung: string;
  adresse: string;
  besucheProMonat: string;
  pin: LatLng | null;
  geocoding: boolean;
  error: string | null;
};

export function FahrtenrechnerMap({ employees, durchschnittKmh }: { employees: EmployeeVM[]; durchschnittKmh: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [tab, setTab] = useState<Tab>("mitarbeiter");
  const [showRadius, setShowRadius] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Neuzuteilungs-Assistent: mehrere Besuchsorte statt einer einzelnen Adresse
  const [besuchsorte, setBesuchsorte] = useState<BesuchsortEntwurf[]>(() => [neuerBesuchsortEntwurf("Zuhause")]);
  const [manualPinTargetId, setManualPinTargetId] = useState<string | null>(null);
  const [geplanteFlsStdWoche, setGeplanteFlsStdWoche] = useState<string>("");

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;
  const geocodedOrte = useMemo(() => besuchsorte.filter((o): o is BesuchsortEntwurf & { pin: LatLng } => o.pin != null), [besuchsorte]);

  function patchBesuchsort(localId: string, patch: Partial<BesuchsortEntwurf>) {
    setBesuchsorte((prev) => prev.map((o) => (o.localId === localId ? { ...o, ...patch } : o)));
  }

  // manualPinTargetId per Ref verfügbar machen, damit der einmalig registrierte click-Handler den aktuellen Wert sieht
  const manualPinTargetIdRef = useRef<string | null>(null);
  useEffect(() => {
    manualPinTargetIdRef.current = manualPinTargetId;
  }, [manualPinTargetId]);

  // Karte einmalig initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([STANDORTE.NITTENDORF.lat, STANDORTE.NITTENDORF.lng], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      maxZoom: 19,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      const targetId = manualPinTargetIdRef.current;
      if (!targetId) return;
      setBesuchsorte((prev) =>
        prev.map((o) => (o.localId === targetId ? { ...o, pin: { lat: e.latlng.lat, lng: e.latlng.lng }, error: null } : o))
      );
      setManualPinTargetId(null);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Cluster-Marker (Besuchsorte + Mitarbeiter-Referenzpunkte + Standorte) neu zeichnen
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;
    group.clearLayers();

    for (const standort of Object.values(STANDORTE)) {
      L.marker([standort.lat, standort.lng], { icon: standortIcon() })
        .bindPopup(`<strong>${standort.name}</strong><br/>Praxis-Standort`)
        .addTo(group);
    }

    for (const employee of employees) {
      const highlighted = selectedEmployeeId === employee.id;
      L.marker([employee.referencePoint.lat, employee.referencePoint.lng], { icon: referenceIcon(employee.color) })
        .bindPopup(
          `<strong>${employee.name}</strong><br/>Referenzpunkt: ${employee.hasWohnort ? "Wohnort" : "Standort " + STANDORTE[employee.primaerStandort].name}<br/>` +
            `Freie Kapazität: ${employee.freieFlsStdWoche.toFixed(2)} Std./Woche<br/>` +
            `Fahrzeit/Woche: ${employee.fahrzeitWocheMin.toFixed(0)} Min.`
        )
        .addTo(group);

      if (showRadius) {
        L.circle([employee.referencePoint.lat, employee.referencePoint.lng], {
          radius: employee.einsatzradiusKm * 1000,
          color: employee.color,
          weight: highlighted ? 2.5 : 1,
          fillOpacity: 0.04,
          opacity: highlighted ? 0.9 : 0.4,
        }).addTo(group);
      }

      for (const c of employee.cases) {
        for (const b of c.besuchsorte) {
          L.marker([b.lat, b.lng], { icon: caseIcon(employee.color) })
            .bindPopup(
              `<strong>${c.clientName}</strong> – ${b.bezeichnung}<br/>Mitarbeiter: ${employee.name}<br/>` +
                `Fahrzeit (einfach): ${b.fahrzeitMinEinzel.toFixed(0)} Min.<br/>Besuche/Monat: ${b.besucheProMonat}`
            )
            .addTo(group);
        }
      }
    }

    for (const ort of geocodedOrte) {
      L.marker([ort.pin.lat, ort.pin.lng], { icon: assistentIcon() })
        .bindTooltip(ort.bezeichnung || "Neuer Besuchsort", { permanent: true, direction: "top", offset: [0, -10] })
        .bindPopup(`<strong>${ort.bezeichnung || "Neuer Besuchsort"}</strong><br/>Vorschau – noch nicht gespeichert`)
        .addTo(group);
    }
  }, [employees, showRadius, selectedEmployeeId, geocodedOrte]);

  function zentriereAuf(standort: StandortKey | "beide") {
    const map = mapRef.current;
    if (!map) return;
    if (standort === "beide") {
      const bounds = L.latLngBounds(Object.values(STANDORTE).map((s) => [s.lat, s.lng] as [number, number]));
      for (const e of employees) bounds.extend([e.referencePoint.lat, e.referencePoint.lng]);
      map.fitBounds(bounds.pad(0.2));
    } else {
      map.setView([STANDORTE[standort].lat, STANDORTE[standort].lng], 12);
    }
  }

  async function handleGeocode(localId: string) {
    const ort = besuchsorte.find((o) => o.localId === localId);
    if (!ort || !ort.adresse.trim()) return;
    patchBesuchsort(localId, { geocoding: true, error: null });
    try {
      const result = await previewGeocode(ort.adresse);
      if (!result) {
        patchBesuchsort(localId, {
          geocoding: false,
          error: "Adresse nicht gefunden. Bitte Schreibweise prüfen oder die Koordinaten manuell per Klick auf der Karte setzen.",
        });
        return;
      }
      patchBesuchsort(localId, { geocoding: false, pin: result });
      const map = mapRef.current;
      if (map) map.setView([result.lat, result.lng], 13);
    } catch {
      patchBesuchsort(localId, { geocoding: false, error: "Geocoding fehlgeschlagen. Bitte erneut versuchen." });
    }
  }

  const vorschlagsliste = useMemo(() => {
    if (geocodedOrte.length === 0) return [];
    const geplant = geplanteFlsStdWoche ? Number(geplanteFlsStdWoche.replace(",", ".")) : 0;

    const berechnet = employees.map((e) => {
      let fahrzeitZuwachsMin = 0;
      const radiusWarnungen: string[] = [];
      for (const ort of geocodedOrte) {
        const fahrzeitEinzelMin = estimatedDriveMinutesBetween(e.referencePoint, ort.pin, durchschnittKmh);
        const besucheProMonat = Number(ort.besucheProMonat.replace(",", ".")) || 0;
        fahrzeitZuwachsMin += weeklyDriveMinutesFromMonthly(fahrzeitEinzelMin, besucheProMonat);
        const luftlinieKm = haversineKm(e.referencePoint, ort.pin);
        if (luftlinieKm > e.einsatzradiusKm) {
          radiusWarnungen.push(`${ort.bezeichnung || "Besuchsort"} (${luftlinieKm.toFixed(1)} km)`);
        }
      }
      const fahrzeitWocheNachZuteilung = e.fahrzeitWocheMin + fahrzeitZuwachsMin;
      const resultingFree = resultingFreeCapacity(e.freieFlsStdWoche, geplant);
      return {
        employee: e,
        fahrzeitZuwachsMin,
        fahrzeitWocheNachZuteilung,
        radiusWarnungen,
        resultingFree,
        kapazitaetsWarning: resultingFree < 0,
      };
    });

    // Primär nach resultierender Gesamt-Fahrzeit/Woche (aufsteigend); Überbuchung wird unabhängig davon
    // ans Ende sortiert (bleibt sichtbar/wählbar, ist aber nie die erste Empfehlung).
    berechnet.sort((a, b) => {
      if (a.kapazitaetsWarning !== b.kapazitaetsWarning) return a.kapazitaetsWarning ? 1 : -1;
      return a.fahrzeitWocheNachZuteilung - b.fahrzeitWocheNachZuteilung;
    });

    let empfohlenVergeben = false;
    return berechnet.map((v) => {
      let kategorie: Empfehlungskategorie;
      if (v.kapazitaetsWarning) {
        kategorie = "UEBERBUCHUNG";
      } else if (!empfohlenVergeben) {
        kategorie = "EMPFOHLEN";
        empfohlenVergeben = true;
      } else {
        kategorie = "MOEGLICH";
      }
      return { ...v, kategorie };
    });
  }, [employees, geocodedOrte, geplanteFlsStdWoche, durchschnittKmh]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <datalist id={BEZEICHNUNG_VORSCHLAEGE_ID}>
        <option value="Zuhause" />
        <option value="Schule" />
        <option value="Sonstiges" />
      </datalist>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => zentriereAuf("NITTENDORF")} className={switcherCls}>
            Nittendorf
          </button>
          <button onClick={() => zentriereAuf("REGENSBURG")} className={switcherCls}>
            Regensburg
          </button>
          <button onClick={() => zentriereAuf("beide")} className={switcherCls}>
            Alle anzeigen
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={showRadius} onChange={(e) => setShowRadius(e.target.checked)} />
            Einsatzradien anzeigen
          </label>
        </div>
        <div ref={containerRef} className="h-[70vh] w-full rounded-[var(--radius-card)] border border-[var(--color-border)]" />
        {manualPinTargetId && (
          <p className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] px-3 py-2 text-sm text-[var(--color-warn-text)]">
            Manueller Modus aktiv: Klicken Sie auf die Karte, um den Standort für „
            {besuchsorte.find((o) => o.localId === manualPinTargetId)?.bezeichnung || "diesen Besuchsort"}&quot; zu setzen.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("mitarbeiter")} className={tab === "mitarbeiter" ? tabActiveCls : tabCls}>
            Mitarbeiter
          </button>
          <button onClick={() => setTab("neuzuteilung")} className={tab === "neuzuteilung" ? tabActiveCls : tabCls}>
            Neuzuteilung
          </button>
        </div>

        {tab === "mitarbeiter" && (
          <div className="flex flex-col gap-2">
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEmployeeId(e.id === selectedEmployeeId ? null : e.id)}
                className={`flex flex-col gap-1 rounded-[var(--radius-card)] border p-3 text-left text-sm transition ${
                  selectedEmployeeId === e.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="font-semibold text-[var(--color-text)]">{e.name}</span>
                </div>
                <span className={e.freieFlsStdWoche < 0 ? "text-[var(--color-coral)]" : "text-[var(--color-text-muted)]"}>
                  Freie Kapazität: {e.freieFlsStdWoche.toFixed(2)} Std./Woche
                </span>
                <span className="text-[var(--color-text-muted)]">
                  Fahrzeit/Woche: {e.fahrzeitWocheMin.toFixed(0)} Min. ({e.nichtAbrechenbareFahrstundenWoche.toFixed(2)} Std.)
                </span>
              </button>
            ))}

            {selectedEmployee && (
              <div className={cardCls}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{selectedEmployee.name} – zugeordnete Fälle</h3>
                {selectedEmployee.cases.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">Keine Fälle mit Geodaten.</p>
                ) : (
                  <ul className="flex flex-col gap-3 text-sm">
                    {selectedEmployee.cases.map((c) => (
                      <li key={c.id} className="border-b border-[var(--color-border)] pb-2 last:border-0">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-[var(--color-text)]">{c.clientName}</span>
                          <span className="text-[var(--color-text-muted)]">{c.fahrzeitWocheMinFall.toFixed(0)} Min./Wo.</span>
                        </div>
                        <ul className="mt-1 flex flex-col gap-0.5 pl-3 text-xs text-[var(--color-text-muted)]">
                          {c.besuchsorte.map((b) => (
                            <li key={b.id} className="flex justify-between gap-2">
                              <span>{b.bezeichnung}</span>
                              <span>
                                {b.fahrzeitMinEinzel.toFixed(0)} Min. × {b.besucheProMonat}/Monat
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedEmployee.besuchsortCountMissingGeo > 0 && (
                  <p className="mt-2 text-xs text-[var(--color-warn-text)]">
                    {selectedEmployee.besuchsortCountMissingGeo} Besuchsort(e) ohne Geodaten (Adresse noch nicht geocodiert).
                  </p>
                )}
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                  Summe: {selectedEmployee.fahrzeitWocheMin.toFixed(0)} Min./Woche · {selectedEmployee.nichtAbrechenbareFahrstundenWoche.toFixed(2)} nicht-abrechenbare Std./Woche
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "neuzuteilung" && (
          <div className="flex flex-col gap-3">
            <div className={cardCls}>
              <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">Besuchsorte des neuen Falls</p>
              <div className="flex flex-col gap-3">
                {besuchsorte.map((ort) => (
                  <div key={ort.localId} className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Bezeichnung</span>
                        <input
                          list={BEZEICHNUNG_VORSCHLAEGE_ID}
                          value={ort.bezeichnung}
                          onChange={(e) => patchBesuchsort(ort.localId, { bezeichnung: e.target.value })}
                          className={`w-28 ${inputCls}`}
                        />
                      </label>
                      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Adresse</span>
                        <div className="flex gap-2">
                          <input
                            value={ort.adresse}
                            onChange={(e) => patchBesuchsort(ort.localId, { adresse: e.target.value, pin: null })}
                            placeholder="Straße Hausnr., PLZ Ort"
                            className={`w-full ${inputCls}`}
                          />
                          <button
                            onClick={() => handleGeocode(ort.localId)}
                            disabled={ort.geocoding || !ort.adresse.trim()}
                            className="shrink-0 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                          >
                            {ort.geocoding ? "Suche…" : "Suchen"}
                          </button>
                        </div>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Besuche/Monat</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={ort.besucheProMonat}
                          onChange={(e) => patchBesuchsort(ort.localId, { besucheProMonat: e.target.value })}
                          className={`w-24 ${inputCls}`}
                        />
                      </label>
                      {besuchsorte.length > 1 && (
                        <button
                          onClick={() => setBesuchsorte((prev) => prev.filter((o) => o.localId !== ort.localId))}
                          className="text-xs font-medium text-[var(--color-coral)] hover:underline"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                    {ort.error && (
                      <div className="mt-2 flex flex-col gap-2">
                        <p className="text-sm text-[var(--color-coral)]">{ort.error}</p>
                        <button
                          onClick={() => setManualPinTargetId(ort.localId)}
                          className="self-start rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]"
                        >
                          Koordinaten manuell auf der Karte setzen
                        </button>
                      </div>
                    )}
                    {ort.pin && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                        Position: {ort.pin.lat.toFixed(5)}, {ort.pin.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setBesuchsorte((prev) => [...prev, neuerBesuchsortEntwurf()])}
                className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-primary)] transition hover:border-[var(--color-primary)]"
              >
                Weiteren Besuchsort hinzufügen
              </button>

              <label className="mt-4 flex max-w-[12rem] flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Geplante FLS-Std./Woche</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={geplanteFlsStdWoche}
                  onChange={(e) => setGeplanteFlsStdWoche(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>

            {vorschlagsliste.length > 0 && (
              <div className="flex flex-col gap-2">
                {vorschlagsliste.map((v) => (
                  <div
                    key={v.employee.id}
                    className={`flex flex-col gap-1.5 rounded-[var(--radius-card)] border p-3 text-sm ${
                      v.kategorie === "EMPFOHLEN"
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: v.employee.color }} />
                      <span className="font-semibold text-[var(--color-text)]">{v.employee.name}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${KATEGORIE_CLS[v.kategorie]}`}>
                        {KATEGORIE_LABEL[v.kategorie]}
                      </span>
                    </div>
                    <span className="text-[var(--color-text)]">
                      Fahrzeit/Woche nach Zuteilung: <span className="font-semibold">{v.fahrzeitWocheNachZuteilung.toFixed(0)} Min.</span>{" "}
                      <span className="text-[var(--color-text-muted)]">
                        (aktuell {v.employee.fahrzeitWocheMin.toFixed(0)} Min., +{v.fahrzeitZuwachsMin.toFixed(0)} Min.)
                      </span>
                    </span>
                    <span className={v.resultingFree < 0 ? "font-semibold text-[var(--color-coral)]" : "text-[var(--color-text)]"}>
                      Freie Kapazität nach Zuteilung: {v.resultingFree.toFixed(2)} Std./Woche
                    </span>
                    {v.radiusWarnungen.length > 0 && (
                      <span className="self-start rounded-full bg-[var(--color-warn-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warn-text)]">
                        ⚠ Außerhalb Einsatzradius ({v.employee.einsatzradiusKm} km): {v.radiusWarnungen.join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const switcherCls =
  "rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]";
const tabCls =
  "flex-1 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]";
const tabActiveCls =
  "flex-1 rounded-[var(--radius-control)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white";
