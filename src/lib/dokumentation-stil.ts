// Gemeinsame fachliche Formulierungs-Leitlinie für die per Diktat erzeugten Dokumentationstexte
// (FLS-Leistungsdokumentation in voice-actions.ts + Interimsmodus in interim/extraction.ts).
// Prisma-frei (Konvention der Codebase für client-/serverübergreifende Textbausteine) - das Praxis-
// Glossar und die fachliche Konzeption werden als Parameter übergeben. Inhaltlich angelehnt an die
// "Zwingenden Regeln" der Abschlussbericht-Generierung (src/lib/berichtsbausteine/generierung-prompt.ts),
// aber auf einen kurzen Einzelbeitrag statt einen ganzen Bericht zugeschnitten.

export type StilGlossarBegriff = { begriff: string; definition: string };

export const DOKUMENTATIONS_STIL_REGELN = `Formuliere den Dokumentationstext nach folgenden Regeln:

- Durchgängig in der ICH-FORM aus Sicht der dokumentierenden Fachkraft ("Ich besprach mit …", "Ich unterstützte … dabei, …", "Mir fiel auf, dass …"). Niemals "die Fachkraft" in der dritten Person, kein unpersönliches Passiv ("es wurde …").
- Gib den Inhalt SINNGEMÄSS und VERDICHTET wieder: Fülllaute, Wiederholungen, Selbstkorrekturen und Nebensächliches weglassen, den fachlichen Gehalt aber vollständig erhalten. Keine wörtliche Abschrift des Diktats.
- Ergänze KEINE Sachverhalte, Wertungen oder Zusammenhänge, die nicht diktiert wurden. Erkennbare Lücken nicht füllen.
- Verwende die Fachsprache der Kinder- und Jugendhilfe (SGB VIII): ressourcen- und lösungsorientierte, systemische Begriffe. Beschreibe Schwierigkeiten klar, ohne die beteiligten Personen auf Defizite oder Fehlverhalten zu reduzieren (würdigende Grundhaltung).
- Halte sprachlich unterscheidbar, was BEOBACHTUNG ist, was AUSSAGE einer beteiligten Person, was gemeinsam entwickelte Erkenntnis und was fachliche EINSCHÄTZUNG oder Hypothese. Hypothesen nicht als Tatsachen darstellen.
- Betrachte Verhalten im Zusammenspiel von Person, Beziehungen, Anforderungen, Ressourcen und Umfeld - nicht isoliert einer Person zugeschrieben.
- Ganze, sachliche Sätze, keine Aufzählungszeichen. Kein Datums- oder Uhrzeit-Vorspann (Datum und Zeit stehen in eigenen Feldern).`;

// Ein einzelnes, bewusst generisches Beispiel - kalibriert Ton, Ich-Form und Verdichtungsgrad, ohne
// inhaltlich auf einen realen Fall Bezug zu nehmen.
export const DOKUMENTATIONS_STIL_BEISPIEL = `Beispiel (nur zur Kalibrierung von Ton und Verdichtung, Inhalt NICHT übernehmen):

Diktat: "ähm also heute war ich bei der Mutter zuhause, wir ham über die Schulsituation gesprochen, sie macht sich Sorgen wegen der vielen Fehltage, ich hab ihr vorgeschlagen dass wir zusammen mal einen Termin bei der Schulsozialarbeit machen und sie war da eigentlich offen für"

Gewünschte Ausgabe: "Ich führte einen Hausbesuch bei der Mutter durch. Wir thematisierten die aktuelle Schulsituation; die Mutter äußerte Sorge angesichts der zunehmenden Fehlzeiten. Ich schlug vor, gemeinsam einen Termin bei der Schulsozialarbeit zu vereinbaren, um die Zusammenarbeit mit dem schulischen System zu stärken. Die Mutter zeigte sich gegenüber diesem Vorschlag aufgeschlossen."`;

/** Baut den Fachsprache-/Ich-Form-Block, der in den `system`-Prompt der Diktat-Extraktoren eingesetzt wird. */
export function buildDokumentationsStilPrompt(params: { glossar?: StilGlossarBegriff[]; fachlicheKonzeption?: string | null }): string {
  const teile = [DOKUMENTATIONS_STIL_REGELN, DOKUMENTATIONS_STIL_BEISPIEL];

  if (params.fachlicheKonzeption?.trim()) {
    teile.push(`Fachliche Konzeption der Praxis (maßgebliche fachliche Perspektive):\n${params.fachlicheKonzeption.trim()}`);
  }

  const glossar = (params.glossar ?? []).filter((g) => g.begriff.trim() && g.definition.trim());
  if (glossar.length > 0) {
    const liste = glossar.map((g) => `- ${g.begriff}: ${g.definition}`).join("\n");
    teile.push(
      `Begriffsglossar der Praxis - werden diese Begriffe verwendet, MUSS die hier hinterlegte Bedeutung zugrunde gelegt werden, nicht eine allgemeinsprachliche:\n${liste}`
    );
  }

  return teile.join("\n\n");
}
