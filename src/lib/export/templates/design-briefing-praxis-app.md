# Design-Briefing – Praxis App
**Praxis für Systemische Entwicklung · Stefan Plötz**
Stand: 23.07.2026

Dieses Dokument fasst die verbindliche Design-Referenz für alle Formulare, Mockups und UI-Komponenten der Praxis App zusammen. Es dient als Vorlage, die Claude Code bei der Umsetzung von HTML/CSS-Komponenten exakt einhalten soll.

---

## 1. Markenphilosophie

Leitprinzipien: Vertrauen, Struktur, Klarheit, Professionalität, Ruhe, Präzision.

Die drei überlappenden Kreise im Logo (Gold, Salbeigrün, Dunkelgrün) symbolisieren das Zusammenspiel von Beratung, Pädagogik und Therapie.

**Logo-Dateien:** `logo.svg` (bevorzugt – Vektorformat, verlustfrei skalierbar, ideal für PDF-Export via Puppeteer/wkhtmltopdf) und `logo.png` (Rasterformat als Fallback). Im Dokumenten-Header wird das Logo klein und dezent eingebunden (Höhe ca. 48px, Seitenverhältnis erhalten), niemals dominant im Vergleich zum Dokumententitel.

---

## 2. Farbsystem (final, verbindlich)

| Farbe | Hex | Verwendung |
|---|---|---|
| Dunkelgrün (Deep Petrol) | `#173F28` | Primärfarbe – Überschriften, zentrale Akzente |
| Salbeigrün | `#4F8157` | Sekundärfarbe – sparsam für Labels |
| Gold/Sand | `#E9B33B` | Akzent – nur für kleine Details |
| Anthrazit | `#2B2B2E` | Primäre Textfarbe |
| Hellgrau | `#E5E5E5` | Rahmen und Hintergründe |
| Warmes Off-White | `#FBFAF7` | Dominante Hintergrundfarbe |

**Wichtig:** Terrakotta ist bewusst nicht mehr Teil der Palette (alte Ampel-Kombination Grün/Gelb/Rot wurde durch die neue harmonische Farbwelt ersetzt). Reines Weiß (`#FFFFFF`) wird nicht als Hintergrund verwendet – stattdessen immer das warme Off-White.

---

## 3. Typografie (korrigiert)

Verbindliche Schriften: **Spectral** (Serif) für Überschriften/Display, **Inter** (Sans-Serif) für Fließtext und UI-Elemente.

*(Hinweis: Schriftnamen wie Avenir, Heisei oder Aperçu aus früheren Recraft-Entwürfen sind Platzhalter aus dem Design-Tool und werden durch Spectral/Inter ersetzt.)*

| Ebene | Schrift | Verwendung |
|---|---|---|
| Display | Spectral, Bold | Dokumententitel |
| H1 | Spectral, Bold | Abschnittsüberschriften |
| H2 | Spectral, SemiBold | Unterabschnitte |
| H3 | Inter, SemiBold | Feinere Gliederung |
| Body | Inter, Regular | Fließtext, 1.6 Zeilenhöhe |
| Caption | Inter, Regular, klein | Fußnoten, Metadaten |

---

## 4. Layout-Grundlagen

- Spacing-Skala: 4 / 8 / 16 / 24 / 32 / 48 / 64 px (Basis 8px-Raster)
- Großzügige Weißräume als aktives Gestaltungselement
- Feste Ränder, Spalten und Gutter für mehrspaltige Layouts
- Seitennummerierung: unten rechts, kleinste/leiseste Textgröße, Anthrazit

---

## 5. Wiederverwendbare Komponenten

- **Client & Assignment Data Block** – Klient, Jugendamt, Adresse, Fachkraft in 2x2-Raster, Sage-Green-Labels
- **Information Block** – einzelne strukturierte Fakten (Label + Wert)
- **Standard-Dokumentationstabelle** – Datum/Uhrzeit/Stunden/Inhalt, fetter Deep-Petrol-Header
- **Formularfelder** – Text Input, Dropdown, Checkbox, Datepicker, Radio, Textarea
- **Signaturbereich** – Linie + Label (Fachkraft/Datum), großzügiger Abstand für Unterschrift
- **Hinweisbox** (optional) – Sand-Gold-Akzentbalken, hellgrauer Hintergrund
- **Status-Label** (optional) – kleines Sage-Green-Quadrat + Text
- **Header & Footer System** – Logo (dezent), Editorial-Titel, dünne Trennlinie, Meta-Zeile, Footer mit Kontaktdaten und Seitenzahl
- **Leistungstabelle mit Beträgen & Summenblock** – für Rechnungen: Leistung/Stunden/Stundensatz/Betrag, rechtsbündige Zahlen, Summenblock mit hervorgehobenem Endbetrag

---

## 5a. Umgesetzte Dokumente

- `komponenten-bibliothek.html` – alle Bausteine als kopierbare Referenz
- `rechnungsformular.html` – erstes vollständig aus dem Baukasten gebautes Formular (Fallname, Stunden, Stundensatz, Endbetrag), dient als zweites Referenzbeispiel neben dem bestehenden Leistungsnachweis

---

## 6. Verbindliche Kontaktdaten (für Header/Footer)

```
Praxis für Systemische Entwicklung
Bernsteinstraße 1, 93152 Nittendorf
Mobil: 0151 588 25 324
```

**Nicht verwenden:** E-Mail-Adresse und Website – existieren aktuell noch nicht.

---

## 7. Hinweis für die Umsetzung mit Claude Code

- Alle Formulare als HTML mit festen CSS-Werten und `data-field`-Attributen
- Vorschau-Rendering über wkhtmltoimage, PDF-Export über Puppeteer oder wkhtmltopdf
- wkhtmltoimage rendert größer als kalkuliert – Overflow beim Layout-Design einplanen und testen
- Keine CSS-Gradients oder Box-Shadows – nur flache Markenfarben
