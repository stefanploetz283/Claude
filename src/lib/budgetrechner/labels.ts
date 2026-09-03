// Budgetrechner: geteilte Beschriftungen/Stile für Seite, Detailansicht und PDF-Export.
import type { AmpelStatus } from "@/lib/umsatz";

export const QUELLE_KATEGORIE_LABEL: Record<string, string> = {
  excel_import: "aus Entgeltkalkulation",
  manuell: "manuell angelegt",
};

export const QUELLE_AUSGABE_LABEL: Record<string, string> = {
  manuell: "manuell",
  finom_import: "Finom-Import",
};

/** Ampel-Optik analog zum Betriebscockpit (AMPEL_STYLES dort), hier lokal gehalten - kein Refactor. */
export const AMPEL_STYLE: Record<AmpelStatus, { bg: string; text: string; label: string }> = {
  gruen: { bg: "var(--color-primary-soft)", text: "var(--color-primary)", label: "im Rahmen" },
  gelb: { bg: "#FBF1DC", text: "#8A5A12", label: "70–100 %" },
  rot: { bg: "#FBE4E1", text: "#B23B2E", label: "über Budget" },
};

/** Für das PDF (kein CSS-Variablen-Kontext): feste Hex-Werte. */
export const AMPEL_HEX: Record<AmpelStatus, string> = { gruen: "#E4EFE9", gelb: "#FBF1DC", rot: "#FBE4E1" };

export function eur(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

export function prozentText(value: number): string {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`;
}
