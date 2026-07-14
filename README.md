# Fallverwaltung

Web-App zur Fallverwaltung für eine sozialpädagogische Praxis (Einzelunternehmer mit mehreren Mitarbeitern).

## Funktionsumfang

- Login mit Rollen (Admin/Mitarbeiter), verpflichtender Zwei-Faktor-Authentifizierung (TOTP) und automatischer Abmeldung bei Inaktivität
- Fallanlage mit Klientendaten, Angebotskatalog, Stundenkontingent und Vertretungsregelung
- Dashboard mit Filtern, Volltextsuche und Warnhinweisen bei knappem Kontingent
- Leistungsdokumentation mit Kapazitätsrechner und PDF-/Excel-Export für Jugendamt bzw. Buchhaltung
- Interne Zeiterfassung (Start/Stopp-Timer, manuelle Korrekturen) getrennt von der Leistungsdokumentation
- Urlaub/Abwesenheit, Terminkalender mit Erinnerungen
- Dokumentenablage pro Fall und praxisweite Fachbox (Wissensplattform)
- Team-Nachrichten inkl. Rundschreiben
- Statistik/Jahresauswertung, Zugriffsprotokoll, Archivieren statt Löschen

## Tech-Stack

- **Next.js 16** (App Router, TypeScript) als Full-Stack-Framework
- **PostgreSQL** mit **Prisma ORM**
- **NextAuth.js v5** (Credentials-Provider) mit selbst implementierter TOTP-2FA
- **Tailwind CSS 4**
- **pdfkit** / **exceljs** für Exporte
- S3-kompatibler Objektspeicher (AWS SDK v3) für Dokumente/Fachbox-Uploads

Der Stack läuft ohne Anpassungen auf **Scalingo** (Node.js-Buildpack, PostgreSQL-Addon).

## Lokale Entwicklung

Voraussetzungen: Node.js 22, PostgreSQL, ein S3-kompatibler Speicher (lokal z.B. über [`s3rver`](https://github.com/jamhall/s3rver) simulierbar).

```bash
npm install
cp .env.example .env   # Werte anpassen
npx prisma migrate dev
npm run prisma:seed    # legt einen initialen Admin-Account an (Passwort wird ausgegeben)
npm run dev
```

App läuft danach auf http://localhost:3000.

### Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindung |
| `AUTH_SECRET` | Langer zufälliger String zum Signieren/Verschlüsseln der Sessions |
| `NEXTAUTH_URL` | Basis-URL der App |
| `AUTH_TRUST_HOST` | In Produktion hinter einem Reverse Proxy auf `true` setzen |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Zugangsdaten für den Objektspeicher (Dokumente, Fachbox, Logo) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Optional: Zugangsdaten für den per Seed-Skript angelegten Admin-Account |

## Deployment auf Scalingo

1. **App anlegen** und PostgreSQL-Addon hinzufügen (liefert automatisch `DATABASE_URL`).
2. **Objektspeicher einrichten**: einen S3-kompatiblen Anbieter mit EU-Sitz wählen (z.B. OVHcloud Object Storage, Scaleway Object Storage) und die `S3_*`-Variablen in den Scalingo-Umgebungsvariablen setzen.
3. **Weitere Umgebungsvariablen** setzen: `AUTH_SECRET` (z.B. `openssl rand -base64 32`), `NEXTAUTH_URL` (die Scalingo-App-URL), `AUTH_TRUST_HOST=true`.
4. **Deployen** per `git push scalingo claude/case-management-app-03kagx:master` (oder den gewünschten Branch als Produktionsbranch konfigurieren).
5. Das `Procfile` enthält einen `release`-Schritt (`npx prisma migrate deploy`), der bei jedem Deploy automatisch die Datenbank-Migrationen anwendet. Falls die Release-Phase in Ihrem Scalingo-Plan nicht automatisch läuft, die Migration einmalig manuell ausführen:
   ```bash
   scalingo --app <app-name> run npx prisma migrate deploy
   ```
6. **Initialen Admin-Account anlegen**:
   ```bash
   scalingo --app <app-name> run npm run prisma:seed
   ```
   Das ausgegebene temporäre Passwort nach dem ersten Login ändern.
7. **Automatische Datensicherung**: Das PostgreSQL-Addon von Scalingo bietet automatische tägliche Backups – im Scalingo-Dashboard unter dem Addon aktivieren/prüfen, ggf. eine Backup-Aufbewahrungsfrist passend zu den Aufbewahrungspflichten der Praxis wählen.

## Design/Branding

Praxisname, Logo und Farbschema lassen sich als Admin unter **Einstellungen** in der App selbst pflegen – keine Code-Änderung nötig. Ohne hinterlegtes Logo wird ein neutrales Platzhalter-Farbschema (Blau/Anthrazit) verwendet.

## Sicherheit & Datenschutz

- Passwörter werden mit bcrypt gehasht, 2FA ist für alle Konten verpflichtend
- Rollenbasierter Zugriff: Mitarbeiter sehen nur eigene/vertretene Fälle, Admin sieht alles
- Zugriffsprotokoll (`Zugriffsprotokoll` im Admin-Bereich) protokolliert Zugriffe auf Fälle und Exporte
- Fälle/Mitarbeiter/Klienten werden archiviert statt gelöscht (Aufbewahrungspflichten)
- Keine sprechenden IDs in URLs (cuid), Datei-Downloads laufen serverseitig über Zugriffsprüfung, nicht über öffentliche Bucket-URLs
