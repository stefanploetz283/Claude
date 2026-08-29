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

export const BERICHTS_KAPITEL_INFO: Record<
  BerichtsKapitel,
  { label: string; hauptkapitel: string; leitfrage: string | null; badgeCls: string }
> = {
  AUSGANGSLAGE: {
    label: "Ausgangslage",
    hauptkapitel: "1. Ausgangslage",
    leitfrage: null,
    badgeCls: "bg-[var(--color-border)] text-[var(--color-text)]",
  },
  VERSTEHEN: {
    label: "Verstehen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was musste verstanden werden, bevor gehandelt werden konnte?",
    badgeCls: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  },
  ERKENNEN: {
    label: "Erkennen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was wurde sichtbar, als die Situation gemeinsam betrachtet wurde?",
    badgeCls: "bg-[var(--color-sage)] text-white",
  },
  VERSTAENDIGEN: {
    label: "Verständigen",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Welches Verständnis verbindet die beteiligten Systeme?",
    badgeCls: "bg-[var(--color-warn-soft)] text-[var(--color-warn-text)]",
  },
  VERAENDERN: {
    label: "Verändern",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Welche Veränderungen fördern neue Formen von Regulation?",
    badgeCls: "bg-[var(--color-gold)] text-white",
  },
  STABILISIEREN: {
    label: "Stabilisieren",
    hauptkapitel: "2. Entwicklungsprozess",
    leitfrage: "Was braucht es, damit die beteiligten Systeme ihre Entwicklung selbst gestalten können?",
    badgeCls: "bg-[var(--color-green-medium)] text-white",
  },
  REGULATION_PASSUNG: {
    label: "Regulation & Passung",
    hauptkapitel: "3. Entwicklung von Regulation und Passung",
    leitfrage: null,
    badgeCls: "bg-[var(--color-primary)] text-white",
  },
  PERSPEKTIVE: {
    label: "Perspektive",
    hauptkapitel: "4. Perspektive",
    leitfrage: null,
    badgeCls: "bg-[var(--color-coral-soft)] text-[var(--color-coral)]",
  },
};

export function isBerichtsKapitel(value: string): value is BerichtsKapitel {
  return (BERICHTS_KAPITEL_ORDER as string[]).includes(value);
}

// Vorbefüllung für die erste Berichtsmanual-Version einer Hilfeart (siehe berichtsmanual-panel.tsx) -
// wörtlich aus dem Prompt "KI-gestütztes Abschlussberichtswesen", Teil 2/3 Punkt 9 übernommen. Wird NICHT
// automatisch in die Datenbank geschrieben (keine Migration kann sicher wissen, welche bestehende
// HelpType-Zeile "PROS Schule" entspricht) - der Admin sieht diesen Text als editierbaren Vorschlag im
// Manual-Panel, solange für die jeweilige Hilfeart noch keine erste Version gespeichert wurde.
export const MANUAL_STANDARDTEXT = `1. Ausgangslage
Beschreibt den Ausgangspunkt der Hilfe: Anlass und Entstehung, Situation des jungen Menschen zu Beginn, relevante familiäre/schulische Bedingungen, bestehende Schwierigkeiten, vorhandene Ressourcen, unterschiedliche Wahrnehmungen der beteiligten Systeme, ursprünglicher Hilfebedarf, Auftrag und Zielsetzung, ggf. vorausgegangene Hilfen, besondere Rahmenbedingungen zum Beginn.
Abgrenzung: Hier werden noch keine späteren Entwicklungen beschrieben - Referenzpunkt für alles Folgende. Zeitlicher Bezug im Inhalt entscheidet über die Zuordnung, nicht der Erfassungszeitpunkt - ein spät erfasster Baustein, der inhaltlich die Anfangssituation beschreibt, gehört trotzdem hierher.

2. Entwicklungsprozess
Fachliches Herzstück, dargestellt anhand von fünf aufeinander bezogenen, nicht zwingend linearen Arbeitsbewegungen:

2.1 Verstehen
Leitfrage: Was musste verstanden werden, bevor gehandelt werden konnte?
Was wird beschrieben: unterschiedliche Perspektiven, relevante biografische/familiäre Zusammenhänge, Belastungs-/Regulationssituationen, erste fachliche Hypothesen, vorhandene Ressourcen/Schutzfaktoren.
Abgrenzung zu Erkennen: Verstehen = grundlegende, oft anfängliche Erschließung von Zusammenhängen und erste Hypothesen.

2.2 Erkennen
Leitfrage: Was wurde sichtbar, als die Situation gemeinsam betrachtet wurde?
Was wird beschrieben: wiederkehrende Interaktionsmuster, Regulationsmuster, Eskalationsdynamiken, zunehmend sichtbare Ressourcen, relevante Wechselwirkungen.
Abgrenzung zu Verstehen: Erkennen = Verdichtung zu Mustern/Dynamiken, die sich erst durch wiederholte Beobachtung oder gemeinsame Betrachtung im Verlauf ergeben hat, nicht die erste Vermutung.

2.3 Verständigen
Leitfrage: Welches Verständnis verbindet die beteiligten Systeme?
Was wird beschrieben: Austausch zwischen Eltern/Schule/weiteren Beteiligten, gemeinsame Klärung unterschiedlicher Wahrnehmungen, Entwicklung eines gemeinsamen Verständnisses, Klärung von Erwartungen/Rollen/Verantwortlichkeiten, Vereinbarungen.

2.4 Verändern
Leitfrage: Welche Veränderungen fördern neue Formen von Regulation?
Was wird beschrieben: veränderte Handlungsweisen, neue Regulationsmöglichkeiten, veränderte Reaktionen von Bezugspersonen, angepasste Anforderungen, neue Kommunikationsformen, genutzte Ressourcen. Soll nachvollziehbar bleiben: Erkenntnis → abgeleitete Veränderung → beobachtbare Wirkung.
Abgrenzung zu Verständigen: Eine erreichte Vereinbarung oder ein gemeinsames Verständnis gehört zunächst zu "Verständigen". Erst wenn daraus tatsächlich neues, beobachtbares Regulationsverhalten entsteht (gemäß Glossar-Definition von Regulation), wird ein Baustein "Verändern" zugeordnet.
Abgrenzung zu Perspektive: Zukünftige Empfehlungen gehören NICHT hierher, sondern in "Perspektive".

2.5 Stabilisieren
Leitfrage: Was braucht es, damit die beteiligten Systeme ihre Entwicklung selbst gestalten können?
Was wird beschrieben: zunehmend selbstständig genutzte Strategien, tragfähiger gewordene Vereinbarungen, verbesserte Zusammenarbeit, Übernahme von Verantwortung, noch fragile Entwicklungen, Bereiche mit weiterhin nötiger Unterstützung.
Abgrenzung zu Kapitel 3: Stabilisieren beschreibt den Prozess des Tragfähig-Werdens (letzter Schritt des Entwicklungsprozesses). Kapitel 3 ist die verdichtete, fallübergreifende fachliche Bewertung des aktuellen Standes von Regulation und Passung, kein erneutes Erzählen des Prozesses.

3. Entwicklung von Regulation und Passung
Verdichtet die Ergebnisse aus Kapitel 2 aus heutiger Sicht (kein erneutes Erzählen des gesamten Prozesses). Betrachtet unter "Regulation": was der junge Mensch heute besser reguliert, welche Situationen schwierig bleiben, verfügbare Regulationsmöglichkeiten, benötigte Unterstützung, Entwicklung co-regulierender Bezugspersonen. Unter "Passung": wie gut Bedürfnisse und Anforderungen zusammenpassen, wo Anpassungen gelungen sind, wo Passungsprobleme bestehen bleiben. Ressourcen werden dort beschrieben, wo deutlich wird, welche vorhandenen Fähigkeiten/Beziehungen/Strukturen Regulation und Passung unterstützen - keine isolierte Aufzählung. Kann relevante Beziehungsebenen der Fall-Triade aufgreifen (z.B. Elternhaus ↔ Schule), ohne künstliche Untergliederung zu erzeugen, wenn eine Ebene für den Fall nicht relevant ist. Grundlogik: Ausgangslage → Entwicklung → aktueller Stand.

4. Perspektive
Richtet den Blick nach vorne: verbleibende Entwicklungsaufgaben, weiterhin bestehender Unterstützungsbedarf, tragfähige Ressourcen, notwendige Rahmenbedingungen, fachlich sinnvolle nächste Schritte, ggf. empfohlene Anschlusshilfen, Kriterien für erneute fachliche Überprüfung. Muss logisch aus den vorherigen Kapiteln hervorgehen, darf keine völlig neuen, vorher nicht nachvollziehbaren Problemstellungen einführen. Eine Empfehlung wird immer aus dem bisherigen Entwicklungsprozess begründet, nicht isoliert ausgesprochen.`;

// Board-Ansicht der Entwicklungsspur (Prompt Teil 2/3 Punkt 7): Schwellenwerte für die visuelle
// Hervorhebung dünn besetzter Kapitel - rein glanceable Hinweis, keine formale Prüfung mit eigener
// Konfiguration wie die spätere Vollständigkeitsprüfung.
export const DUENN_BESETZT_SCHWELLE = 2;
