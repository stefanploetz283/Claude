# Projekt-Übergabe: Fallverwaltung

Stand: 2026-07-27. Diese Datei fasst den aktuellen Stand und die offenen Punkte zusammen, damit die Arbeit auf einem anderen Gerät (z.B. Surface) nahtlos fortgesetzt werden kann. Einfach in einer neuen Claude-Code-Sitzung im Projektordner erwähnen: "Lies UEBERGABE.md für den aktuellen Stand".

## Was die App ist

Web-App zur Fallverwaltung für eine sozialpädagogische Praxis (Einzelunternehmer mit mehreren Mitarbeitern). Details zu Funktionsumfang, Tech-Stack und lokalem Setup: siehe [README.md](README.md).

## Zuletzt abgeschlossen (dieses Gespräch)

1. **Rollen-/Berechtigungssystem (3 Rollen)**: ADMIN (Vollzugriff), FACHKRAFT/EMPLOYEE (nur eigene Fälle, kein Zugriff auf Abrechnung/Einstellungen/fremde Fachkraft-Dokumentation), VERWALTUNG (eigener Rechnungsbereich, explizit kein Zugriff auf fachliche Dokumentationsinhalte). Serverseitig durchgesetzt (nicht nur UI), verifiziert per direktem API-Zugriff (403/404 für unautorisierte Rollen). Dabei auch einen echten Bug behoben: VERWALTUNG landete nach Login auf leerem `/dashboard` statt `/rechnungen`.
2. **Kapazitätsplanung & Warteliste** (`/kapazitaet`): Stunden-Budget-Modell.
   - Pro Hilfeart ein "Wochenprofil" (Admin → Hilfearten): mehrere Aktivitätskategorien mit je einer Wochenstundenzahl. Die **Summe dieser Werte** treibt die Kapazitätsrechnung (nicht `Stundenkontingent / Laufzeit-Wochen` — dieses Verhältnis ist nur eine separate Vergleichsgröße).
   - Pro Mitarbeiter: Vertragsstunden + Freigabe, welche Hilfearten er/sie übernehmen darf (Admin → Mitarbeiter). Neue Fachkräfte werden automatisch für "PROS Schule" freigeschaltet.
   - Lineare Auslaufphase (`expectedEndDate`/`phaseOutWeeks` pro Fall): Wochenrate sinkt linear gegen Null, wodurch überlappende Fälle möglich werden, wenn die Stunden es hergeben.
   - Warteliste mit automatischem Zeitfenster-Vorschlag ("ab KW X verfügbar bei Fachkraft Y"), gefiltert nach Hilfeart-Freigabe. "Einplanen" wandelt einen Wartelisten-Eintrag direkt in echten Klient+Fall um.
   - Ende-zu-Ende mit echten Testdaten verifiziert, alle Testartefakte wieder entfernt.

## Gerade in Arbeit / als Nächstes besprochen

- **Farb-/Layout-Redesign**: Die Grundfarben der Praxis haben sich geändert, Stefan überarbeitet Farben *und* Layout komplett neu in Figma (Basis: Screenshots der aktuellen App). Aktuelle Farb-Tokens stehen zentral in [src/app/globals.css](src/app/globals.css) (`--color-primary: #1f5a36`, `--color-yellow: #f4b83f`, `--color-orange: #ed9438`, `--color-coral: #d65a3a`, `--color-bg: #f8f7f3`, u.a.) — beim Audit wurde zusätzlich festgestellt, dass ca. 8 Dateien eigene Hex-Werte für Status-Badges verwenden statt der zentralen Variablen (z.B. 4 leicht unterschiedliche Gelb/Orange-Badge-Töne) — das sollte bei der Neuumsetzung mit konsolidiert werden.
- Übergabe-Format sobald Figma-Entwurf fertig ist: am liebsten ein Figma-Share-Link (Dev-Mode), sonst PNG-Export pro Seite + finale Hex-Werte-Liste.

## Offene/zurückgestellte Punkte (proaktiv im Auge behalten)

- **Freigabe-Workflow**: Admin soll Fachkraft-Dokumentation vor Abrechnung freigeben müssen. Bewusst zurückgestellt bis nach dem Rollensystem (jetzt fertig) — noch nicht begonnen. Offene Designfrage: soll Rechnungserstellung freigegebene Einträge voraussetzen?
- **E-Mail-Versand direkt aus der App** (Verwaltung will Rechnungen an Kostenträger mailen). Kein Mail-Provider integriert. Aktuell: PDF manuell herunterladen und außerhalb der App versenden. Eigenständiges Feature (SMTP/Resend/Postmark, Vorlagen, Versand-Log).
- **Fallanfrage-Formular vom Jugendamt** (drittes Dokument-Template neben Leistungsnachweis/Rechnung). Stefan liefert noch die finale Inhalts-Struktur, dann Umsetzung analog zur bestehenden PDF-Pipeline (`src/lib/export/`).
- **Scalingo-Deployment**: Pausiert, um sich auf lokale App-Entwicklung zu konzentrieren, noch nicht wieder aufgenommen. Hinweis: Puppeteer (für Rechnungs-PDF) bringt ein ~300MB-Chromium mit, das bei der Deploy-Größe/RAM-Dimensionierung auf Scalingo berücksichtigt werden muss. **Relevant für die Surface-Frage**: Falls die App auf mehreren Geräten laufen soll, ist ein fertiges Scalingo-Deployment vermutlich die sauberere Lösung als lokales Postgres auf jedem Gerät einzeln (sonst zwei getrennte, nicht synchronisierte Datenbanken mit echten Klientendaten).

## Für die lokale Einrichtung auf einem neuen Gerät

Siehe [README.md](README.md) Abschnitt "Lokale Entwicklung": Node.js 22, PostgreSQL, S3-kompatibler Speicher (lokal z.B. `s3rver`) nötig, dann `npm install`, `.env` anlegen, `npx prisma migrate dev`, `npm run prisma:seed`, `npm run dev`.

**Wichtig**: Der fertige Windows-Launcher (`Fallverwaltung starten.exe` im Projekt-Root) setzt voraus, dass Node.js/PostgreSQL auf dem jeweiligen Gerät bereits lokal installiert sind — er installiert diese Abhängigkeiten nicht selbst. Er wurde für dieses PC gebaut und nutzt eine lokale PostgreSQL-Datenbank; auf einem zweiten Gerät entsteht damit eine **eigene, leere Datenbank ohne die echten Fall-/Klientendaten** dieses PCs. Für parallele Nutzung auf mehreren Geräten mit denselben Daten ist ein zentrales Deployment (Scalingo, siehe oben) die bessere Lösung.
