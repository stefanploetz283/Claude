import type { BerichtsKapitel } from "@prisma/client";

// Die acht Kapitel-"Blätter" des Berichtsmanuals (PROS Schule), siehe Prompt "KI-gestütztes
// Abschlussberichtswesen", Teil 2/3 Punkt 9. Bewusst hier als Konstante hinterlegt, NICHT aus einer DB
// gelesen: das versionierte, admin-editierbare Berichtsmanual (inkl. vollständiger "Was wird
// beschrieben?"/"Abgrenzung"-Texte für die endgültige Zuordnung bei der Berichtsgenerierung) folgt erst
// in Phase 2. Bis dahin dient diese Liste nur der groben, unverbindlichen Vorab-Kategorisierung bei der
// Erfassung (Punkt 4) sowie den Auswahl-/Anzeige-Labels in der UI - keine der hier hinterlegten Leitfragen
// wird für die endgültige, kontextsensitive Zuordnung verwendet.
export const BERICHTS_KAPITEL_ORDER: BerichtsKapitel[] = [
  "AUSGANGSLAGE",
  "VERSTEHEN",
  "ERKENNEN",
  "VERSTAENDIGEN",
  "VERAENDERN",
  "STABILISIEREN",
  "REGULATION_PASSUNG",
  "PERSPEKTIVE",
];

export const BERICHTS_KAPITEL_INFO: Record<BerichtsKapitel, { label: string; hauptkapitel: string; leitfrage: string | null }> = {
  AUSGANGSLAGE: {
    label: "Ausgangslage",
    hauptkapitel: "1. Ausgangslage",
    leitfrage: null,
  },
  VERSTEHEN: {
    label: "Verstehen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was musste verstanden werden, bevor gehandelt werden konnte?",
  },
  ERKENNEN: {
    label: "Erkennen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was wurde sichtbar, als die Situation gemeinsam betrachtet wurde?",
  },
  VERSTAENDIGEN: {
    label: "Verständigen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Welches Verständnis verbindet die beteiligten Systeme?",
  },
  VERAENDERN: {
    label: "Verändern",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Welche Veränderungen fördern neue Formen von Regulation?",
  },
  STABILISIEREN: {
    label: "Stabilisieren",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was braucht es, damit die beteiligten Systeme ihre Entwicklung selbst gestalten können?",
  },
  REGULATION_PASSUNG: {
    label: "Regulation & Passung",
    hauptkapitel: "3. Entwicklung von Regulation und Passung",
    leitfrage: null,
  },
  PERSPEKTIVE: {
    label: "Perspektive",
    hauptkapitel: "4. Perspektive",
    leitfrage: null,
  },
};

export function isBerichtsKapitel(value: string): value is BerichtsKapitel {
  return (BERICHTS_KAPITEL_ORDER as string[]).includes(value);
}
