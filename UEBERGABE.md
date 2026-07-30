# Projekt-Übergabe: Fallverwaltung

Stand: 2026-07-28. Diese Datei fasst den aktuellen Stand und die offenen Punkte zusammen, damit die Arbeit auf einem anderen Gerät (z.B. Surface) nahtlos fortgesetzt werden kann. In einer neuen Claude-Code-Sitzung im Projektordner einfach sagen: "Lies UEBERGABE.md für den aktuellen Stand".

## Was die App ist

Web-App zur Fallverwaltung für eine sozialpädagogische Praxis (Einzelunternehmer mit mehreren Mitarbeitern). Details zu Funktionsumfang, Tech-Stack: siehe [README.md](README.md).

## Die App ist jetzt live im Einsatz (seit 2026-07-28)

**URL**: https://fallverwaltung-ploetz.osc-fr1.scalingo.io

Kompletter Produktiv-Stack, eingerichtet und Ende-zu-Ende getestet:

- **Hosting**: Scalingo (App-Name `fallverwaltung-ploetz`, Region Paris/`osc-fr1`), Container-Größe M. Git-Remote `scalingo` zeigt auf `git@ssh.osc-fr1.scalingo.com:fallverwaltung-ploetz.git`. Scalingo-CLI liegt lokal unter `%USERPROFILE%\scalingo-cli\`, ist per API-Token eingeloggt, SSH-Deploy-Key liegt unter `~/.ssh/id_ed25519` und ist bei Scalingo hinterlegt.
- **Datenbank**: PostgreSQL-Addon (`postgresql-starter-512`), alle Migrationen angewendet.
- **Admin-Account**: `stefanploetz283@gmail.com`, Initialpasswort wurde per Seed-Skript vergeben — **bitte prüfen, ob es schon geändert wurde**, sonst unter Einstellungen ändern. 2FA (TOTP) muss auf dem jeweiligen Gerät individuell eingerichtet werden.
- **Sprachdokumentation**: `ANTHROPIC_API_KEY` als Scalingo-Umgebungsvariable gesetzt (Claude Haiku), funktioniert live.
- **Dokumentenspeicher**: OVHcloud Object Storage, Projekt "Project 2026-07-28", Container `fallverwaltung-dokumente`, Region Paris (`EU-WEST-PAR`), S3-Endpoint `https://s3.eu-west-par.io.cloud.ovh.net`. Zugangsdaten als `S3_*`-Umgebungsvariablen auf Scalingo hinterlegt, Upload live getestet und funktionsfähig.
- **GitHub**: `github.com/stefanploetz283/Claude`, Branch `main`, vollständig synchron mit dem deployten Stand.

### Wichtige Stolpersteine, falls nochmal an der Konfiguration gearbeitet wird

- Der **OVHcloud-Objektspeicher-Endpoint für Paris** lautet `s3.eu-west-par.io.cloud.ovh.net` — nicht das naheliegendere `s3.par.io.cloud.ovh.net` (existiert nicht, DNS-Fehler). Andere OVH-Regionen folgen dem Muster `s3.<region-kurzcode>.io.cloud.ovh.net`, Paris ist eine Ausnahme mit dem längeren Code `eu-west-par`.
- Container/Nutzer, die während der **Discovery-Phase** (vor Aktivierung der Zahlungsmethode) in OVHcloud angelegt werden, werden beim Aktivieren des Projekts (Zahlungsfreischaltung) offenbar verworfen — nach der Aktivierung mussten Container und Nutzer neu angelegt werden.
- Scalingo führt die `release`-Phase (`npx prisma migrate deploy` laut `Procfile`) **nicht automatisch** aus — nach jedem Deploy mit neuen Migrationen einmal manuell ausführen: `scalingo --app fallverwaltung-ploetz run npx prisma migrate deploy`.
- Next.js versucht Seiten mit Datenbankzugriff beim Build statisch vorzurendern, was beim allerersten Deploy (leere DB) fehlschlägt — betroffene Seiten brauchen `export const dynamic = "force-dynamic";` (siehe `src/app/login/page.tsx`).

## Zuletzt abgeschlossen (Feature-Arbeit)

1. **Rollen-/Berechtigungssystem (3 Rollen)**: ADMIN (Vollzugriff), FACHKRAFT/EMPLOYEE (nur eigene Fälle), VERWALTUNG (eigener Rechnungsbereich, kein Zugriff auf fachliche Dokumentationsinhalte). Serverseitig durchgesetzt.
2. **Kapazitätsplanung & Warteliste** (`/kapazitaet`): Stunden-Budget-Modell mit Wochenprofilen je Hilfeart, Vertragsstunden + Hilfeart-Freigabe je Mitarbeiter, linearer Auslaufphase, automatischen Zeitfenster-Vorschlägen für die Warteliste.

## Offen / zurückgestellt

- **Farb-/Layout-Redesign**: Stefan überarbeitet Farben *und* Layout komplett neu in Figma (Basis: Screenshots der aktuellen App). Aktuelle Farb-Tokens zentral in [src/app/globals.css](src/app/globals.css). Beim Audit festgestellt: ca. 8 Dateien verwenden eigene Hex-Werte für Status-Badges statt der zentralen Variablen — sollte bei der Neuumsetzung konsolidiert werden. Übergabe-Format sobald fertig: am liebsten Figma-Share-Link (Dev-Mode), sonst PNG-Export + Hex-Werte-Liste.
- **Freigabe-Workflow**: Admin soll Fachkraft-Dokumentation vor Abrechnung freigeben müssen. Noch nicht begonnen.
- **E-Mail-Versand direkt aus der App**: Kein Mail-Provider integriert, PDF wird aktuell manuell verschickt.
- **Fallanfrage-Formular vom Jugendamt**: Stefan liefert noch die finale Inhalts-Struktur.
- **Mitarbeiter-Accounts**: Für Stefans Frau und weitere Fachkräfte noch anzulegen (Admin → Mitarbeiter).
- **Eigene Domain** statt `scalingo.io`-Adresse: optional, ~1€/Monat, noch nicht eingerichtet.

## Für die Einrichtung auf einem neuen Gerät (z.B. Surface)

Da die App jetzt zentral bei Scalingo gehostet läuft, ist **kein lokales PostgreSQL/S3 mehr nötig**, um weiterzuentwickeln:

```bash
git clone https://github.com/stefanploetz283/Claude.git "Fallverwaltung"
cd Fallverwaltung
npm install
```

Für Deploys von diesem Gerät aus: Scalingo-CLI installieren (siehe `doc.scalingo.com/tools/cli/start`), `scalingo login --api-token DEIN_TOKEN` (Token im Scalingo-Dashboard unter Account-Einstellungen erzeugen), dann `scalingo --app fallverwaltung-ploetz git-setup`, um den Git-Remote automatisch einzurichten.

Änderungen lassen sich damit direkt gegen die echte Produktions-App entwickeln und testen (`git push scalingo main:master` deployt), ohne lokale Datenbank. Für risikoärmeres Testen vor dem Live-Deploy wäre ein Scalingo Review-App/Staging-Setup ein sinnvoller nächster Schritt, aber aktuell nicht eingerichtet.

Für eine rein lokale Entwicklungsumgebung (z.B. für Offline-Arbeit) weiterhin möglich: siehe [README.md](README.md) Abschnitt "Lokale Entwicklung" (Node.js 22, PostgreSQL, S3-kompatibler Speicher lokal z.B. via `s3rver`). Das erzeugt aber eine eigene, leere Datenbank ohne die echten Produktionsdaten.
