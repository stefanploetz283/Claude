"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  STANDORTE,
  haversineKm,
  estimatedDriveMinutesBetween,
  computeScore,
  resultingFreeCapacity,
  KAPAZITAET_GEWICHT_DEFAULT,
  type LatLng,
  type StandortKey,
} from "@/lib/fahrtenrechner/calc";
import { previewGeocode } from "./actions";
import type { EmployeeVM } from "./types";

const cardCls = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]";

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

export function FahrtenrechnerMap({ employees }: { employees: EmployeeVM[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const assistentMarkerRef = useRef<L.Marker | null>(null);

  const [tab, setTab] = useState<Tab>("mitarbeiter");
  const [showRadius, setShowRadius] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Neuzuteilungs-Assistent
  const [adresse, setAdresse] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [manualPinMode, setManualPinMode] = useState(false);
  const [besucheProWoche, setBesucheProWoche] = useState(1);
  const [geplanteFlsStdWoche, setGeplanteFlsStdWoche] = useState<string>("");
  const [kapazitaetGewicht, setKapazitaetGewicht] = useState(KAPAZITAET_GEWICHT_DEFAULT);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;

  // manualPinMode per Ref verfügbar machen, damit der einmalig registrierte click-Handler den aktuellen Wert sieht
  const manualPinModeRef = useRef(false);
  useEffect(() => {
    manualPinModeRef.current = manualPinMode;
  }, [manualPinMode]);

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
      if (!manualPinModeRef.current) return;
      setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      setGeocodeError(null);
      setManualPinMode(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Cluster-Marker (Fälle + Mitarbeiter-Referenzpunkte + Standorte) neu zeichnen
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
        L.marker([c.lat, c.lng], { icon: caseIcon(employee.color) })
          .bindPopup(
            `<strong>${c.clientName}</strong><br/>Mitarbeiter: ${employee.name}<br/>` +
              `Fahrzeit (einfach): ${c.fahrzeitMinEinzel.toFixed(0)} Min.<br/>Besuche/Woche: ${c.besucheProWoche}`
          )
          .addTo(group);
      }
    }

    if (pin) {
      const marker = L.marker([pin.lat, pin.lng], { icon: assistentIcon() }).bindPopup("Neuer Fall (Vorschau)");
      marker.addTo(group);
      assistentMarkerRef.current = marker;
    }
  }, [employees, showRadius, selectedEmployeeId, pin]);

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

  async function handleGeocode() {
    if (!adresse.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const result = await previewGeocode(adresse);
      if (!result) {
        setGeocodeError(
          "Die Adresse konnte nicht automatisch gefunden werden. Bitte Schreibweise prüfen oder die Koordinaten manuell per Klick auf der Karte setzen."
        );
        return;
      }
      setPin(result);
      const map = mapRef.current;
      if (map) map.setView([result.lat, result.lng], 13);
    } finally {
      setGeocoding(false);
    }
  }

  const vorschlagsliste = useMemo(() => {
    if (!pin) return [];
    const geplant = geplanteFlsStdWoche ? Number(geplanteFlsStdWoche.replace(",", ".")) : 0;
    return employees
      .map((e) => {
        const fahrzeitZuwachsMin = estimatedDriveMinutesBetween(e.referencePoint, pin) * besucheProWoche;
        const luftlinieKm = haversineKm(e.referencePoint, pin);
        const score = computeScore(fahrzeitZuwachsMin, e.freieFlsStdWoche, kapazitaetGewicht);
        const resultingFree = resultingFreeCapacity(e.freieFlsStdWoche, geplant);
        return {
          employee: e,
          fahrzeitZuwachsMin,
          luftlinieKm,
          score,
          resultingFree,
          radiusWarning: luftlinieKm > e.einsatzradiusKm,
          kapazitaetsWarning: resultingFree < 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [employees, pin, besucheProWoche, geplanteFlsStdWoche, kapazitaetGewicht]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
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
        {manualPinMode && (
          <p className="rounded-[var(--radius-control)] bg-[var(--color-warn-soft)] px-3 py-2 text-sm text-[var(--color-warn-text)]">
            Manueller Modus aktiv: Klicken Sie auf die Karte, um den Fall-Standort zu setzen.
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
                  <ul className="flex flex-col gap-2 text-sm">
                    {selectedEmployee.cases.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2 border-b border-[var(--color-border)] pb-1.5 last:border-0">
                        <span className="text-[var(--color-text)]">{c.clientName}</span>
                        <span className="text-[var(--color-text-muted)]">
                          {c.fahrzeitMinEinzel.toFixed(0)} Min. × {c.besucheProWoche}/Wo.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedEmployee.caseCountMissingGeo > 0 && (
                  <p className="mt-2 text-xs text-[var(--color-warn-text)]">
                    {selectedEmployee.caseCountMissingGeo} Fall/Fälle ohne Geodaten (Klientenadresse noch nicht geocodiert).
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
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">Adresse des neuen Falls</span>
                <div className="flex gap-2">
                  <input
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Straße Hausnr., PLZ Ort"
                    className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                  <button
                    onClick={handleGeocode}
                    disabled={geocoding || !adresse.trim()}
                    className="shrink-0 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    {geocoding ? "Suche…" : "Suchen"}
                  </button>
                </div>
              </label>
              {geocodeError && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-sm text-[var(--color-coral)]">{geocodeError}</p>
                  <button
                    onClick={() => setManualPinMode(true)}
                    className="self-start rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)]"
                  >
                    Koordinaten manuell auf der Karte setzen
                  </button>
                </div>
              )}
              {pin && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Position: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Besuche/Woche</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={besucheProWoche}
                    onChange={(e) => setBesucheProWoche(Number(e.target.value))}
                    className="w-24 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Geplante FLS-Std./Woche</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={geplanteFlsStdWoche}
                    onChange={(e) => setGeplanteFlsStdWoche(e.target.value)}
                    className="w-32 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Gewicht Kapazität (Score)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={kapazitaetGewicht}
                    onChange={(e) => setKapazitaetGewicht(Number(e.target.value))}
                    className="w-24 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                </label>
              </div>
            </div>

            {pin && (
              <div className="flex flex-col gap-2">
                {vorschlagsliste.map((v, i) => (
                  <div
                    key={v.employee.id}
                    className={`flex flex-col gap-1 rounded-[var(--radius-card)] border p-3 text-sm ${
                      i === 0 ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: v.employee.color }} />
                      <span className="font-semibold text-[var(--color-text)]">{v.employee.name}</span>
                      <span className="ml-auto text-xs font-semibold text-[var(--color-text-muted)]">Score: {v.score.toFixed(1)}</span>
                    </div>
                    <span className="text-[var(--color-text-muted)]">Fahrzeit-Zuwachs: {v.fahrzeitZuwachsMin.toFixed(1)} Min./Woche</span>
                    <span className={v.resultingFree < 0 ? "font-semibold text-[var(--color-coral)]" : "text-[var(--color-text-muted)]"}>
                      Freie Kapazität nach Zuteilung: {v.resultingFree.toFixed(2)} Std./Woche
                    </span>
                    {v.kapazitaetsWarning && (
                      <span className="rounded-full bg-[var(--color-coral-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-coral)]">
                        ⚠ Überbuchung
                      </span>
                    )}
                    {v.radiusWarning && (
                      <span className="rounded-full bg-[var(--color-warn-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warn-text)]">
                        ⚠ Außerhalb Einsatzradius ({v.employee.einsatzradiusKm} km, Luftlinie {v.luftlinieKm.toFixed(1)} km)
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
