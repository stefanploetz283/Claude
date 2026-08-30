import { BERICHTS_KAPITEL_INFO } from "./manual";
import type { BerichtsKapitel } from "@prisma/client";

export type GenerierungsBaustein = {
  erfassungszeitpunktLabel: string; // dd.MM.yyyy
  originaltext: string;
  erstellerName: string;
  vorlaeufigeKategorie: BerichtsKapitel | null;
  triadeZuordnung: string[];
  bezugKurzbeschreibung: string | null;
};

export type GenerierungsTerminStichpunkt = { datumLabel: string; stichpunkt: string };

export type GenerierungsGlossarBegriff = { begriff: string; definition: string };
export type GenerierungsReferenzbericht = { titel: string; text: string };

/**
 * Baut den vollständigen Generierungs-Prompt (Prompt Teil 3/3 Punkt 11) - die sechs Quellen in genau der
 * vorgegebenen Rangfolge, gefolgt von den zwingenden Regeln. Bewusst als reine, prisma-freie Funktion
 * gehalten (Konvention dieser Codebase für Client-/Server-übergreifend nutzbare Formel-/Textbausteine).
 */
export function buildGenerierungsPrompt(params: {
  manualText: string;
  bausteine: GenerierungsBaustein[];
  fachlicheKonzeption: string;
  glossar: GenerierungsGlossarBegriff[];
  terminListe: GenerierungsTerminStichpunkt[];
  referenzberichte: GenerierungsReferenzbericht[];
  triade: string[];
  fallfuehrendeFachkraftName: string;
  klientName: string;
}): string {
  const {
    manualText,
    bausteine,
    fachlicheKonzeption,
    glossar,
    terminListe,
    referenzberichte,
    triade,
    fallfuehrendeFachkraftName,
    klientName,
  } = params;

  const bausteineText = bausteine
    .map((b, i) => {
      const kategorie = b.vorlaeufigeKategorie
        ? `${BERICHTS_KAPITEL_INFO[b.vorlaeufigeKategorie].label} (${BERICHTS_KAPITEL_INFO[b.vorlaeufigeKategorie].hauptkapitel})`
        : "keine vorläufige Kategorie";
      const triadeLabel = b.triadeZuordnung.length > 0 ? b.triadeZuordnung.join(", ") : "keine";
      const bezugLabel = b.bezugKurzbeschreibung ? `\nBezieht sich auf: ${b.bezugKurzbeschreibung}` : "";
      return `[Baustein ${i + 1} - ${b.erfassungszeitpunktLabel} - erfasst von ${b.erstellerName}]
Vorläufige Kategorie (unverbindlich, ggf. abweichend zuzuordnen): ${kategorie}
Triade-Zuordnung: ${triadeLabel}${bezugLabel}
Text: ${b.originaltext}`;
    })
    .join("\n\n");

  const glossarText = glossar.map((g) => `- ${g.begriff}: ${g.definition}`).join("\n");

  const terminText =
    terminListe.length > 0
      ? terminListe.map((t) => `- ${t.datumLabel}: ${t.stichpunkt}`).join("\n")
      : "(keine dokumentierten Termine vorhanden)";

  const referenzberichteText =
    referenzberichte.length > 0
      ? referenzberichte.map((r, i) => `[Referenzbericht ${i + 1} - "${r.titel}"]\n${r.text}`).join("\n\n")
      : "(keine freigegebenen Referenzberichte vorhanden)";

  return `Du erstellst den Entwurf eines sozialpädagogischen Abschlussberichts (PROS-Fachkonzept) für ${klientName}. Die fachliche Einschätzung liegt bei der Fachkraft - du übernimmst ausschließlich Sammeln, Strukturieren, Zuordnen und Formulieren, nicht die fachliche Bewertung selbst.

## 1. Berichtsmanual (bestimmt Struktur/Gliederung)
${manualText}

## 2. Gesammelte Berichtsbausteine (bestimmen den Inhalt)
Fall-Triade (relevante Systeme): ${triade.length > 0 ? triade.join(", ") : "nicht hinterlegt"}

${bausteineText || "(keine Bausteine vorhanden)"}

## 3. Fachliche Konzeption (bestimmt die fachliche Perspektive)
${fachlicheKonzeption || "(keine fachliche Konzeption hinterlegt)"}

## 4. Begriffsglossar (verbindliche Bedeutung zentraler Fachbegriffe)
${glossarText || "(kein Glossar hinterlegt)"}
Werden diese Begriffe im Text oder bei der fachlichen Einordnung verwendet, MUSS die Glossar-Definition zugrunde gelegt werden, nicht eine allgemeinsprachliche Bedeutung.

## 5. Chronologische Liste aus der Leistungsnachweis-Historie
AUSSCHLIESSLICH zum Faktenabgleich (korrekte Daten, Reihenfolge, Zeitraum der Hilfe) - NICHT als sprachliche oder strukturelle Quelle für den Bericht:
${terminText}

## 6. Freigegebene Referenzberichte (bestimmen ausschließlich Sprache/Stil/Tonalität)
Referenzberichte dürfen keine Ereignisse, Einschätzungen, Entwicklungen oder Empfehlungen auf den aktuellen Fall übertragen - sie beantworten ausschließlich "Wie schreiben wir?", niemals "Was schreiben wir?":
${referenzberichteText}

## Zwingende Regeln
- Keine Informationen erfinden oder ergänzen, die nicht in den Bausteinen enthalten sind; bei relevanten Lücken diese benennen statt zu füllen.
- Bausteine dürfen über Zeitpunkte hinweg zu einem nachvollziehbaren Entwicklungsbogen verbunden werden, aber keine Zusammenhänge herstellen, die aus dem Material nicht hervorgehen.
- Fachlichkeit vor sprachlicher Eleganz - keine Informationen verschieben oder Zusammenhänge erzeugen, die nicht im Fallmaterial stehen.
- Keine Ereignisliste, sondern die Darstellungslogik verstehen → erkennen → verständigen → verändern → stabilisieren.
- Würdigende Grundhaltung: anerkennen was ist, verstehen wie es geworden ist, daraus Möglichkeiten für zukünftige Entwicklung erschließen - Schwierigkeiten klar beschreiben, ohne Menschen auf Defizite oder problematisches Verhalten zu reduzieren.
- Beobachtung, Aussage eines Beteiligten, gemeinsam entwickelte Erkenntnis, fachliche Hypothese und fachliche Einschätzung müssen sprachlich unterscheidbar bleiben; Hypothesen nicht als Tatsachen darstellen.
- Personenzentriert-systemische Perspektive: Verhalten nicht isoliert einer Person zuschreiben, Wechselwirkungen zwischen Person-Beziehungen-Anforderungen-Ressourcen-Umweltbedingungen berücksichtigen.
- Schreibe konsequent aus der Ich-Perspektive von ${fallfuehrendeFachkraftName} (der fallführenden Fachkraft), nicht künstlich von "der Fachkraft" in dritter Person.
- Die endgültige Kapitel-Zuordnung jedes Bausteins erfolgt hier mit vollem Kontext - orientiere dich dabei an den vollständigen Kapitel-Definitionen aus dem Manual oben (Leitfrage, "Was wird beschrieben?", "Welche Bausteine werden zugeordnet?", insbesondere "Abgrenzung"), nicht nur an Kapitel-Namen. Ein Baustein kann mehreren Kapiteln zugeordnet werden, wenn er dort jeweils eine unterschiedliche fachliche Funktion erfüllt.
- Ergebnis: vollständiger Berichtsentwurf nach den vier Hauptkapiteln des Manuals (inkl. Unterkapiteln bei "Entwicklungsprozess"), als klar mit Markdown-Überschriften (##) gegliederter Text.

Erstelle jetzt den vollständigen Abschlussbericht-Entwurf.`;
}
