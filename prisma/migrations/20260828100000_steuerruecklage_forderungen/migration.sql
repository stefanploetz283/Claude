-- CreateEnum
CREATE TYPE "RechnungStatus" AS ENUM ('OFFEN', 'BEZAHLT');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "status" "RechnungStatus" NOT NULL DEFAULT 'OFFEN',
ADD COLUMN "bezahltAm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateEnum
CREATE TYPE "VorsorgeArt" AS ENUM ('RUERUP_RENTE', 'KRANKENVERSICHERUNG', 'SONSTIGE');

-- CreateTable
CREATE TABLE "PraxisVorsorgeaufwandEintrag" (
    "id" TEXT NOT NULL,
    "art" "VorsorgeArt" NOT NULL,
    "betragMonatlich" DECIMAL(8,2) NOT NULL,
    "gueltigAb" DATE NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PraxisVorsorgeaufwandEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PraxisVorsorgeaufwandEintrag_art_gueltigAb_idx" ON "PraxisVorsorgeaufwandEintrag"("art", "gueltigAb");

-- CreateEnum
CREATE TYPE "Veranlagungsart" AS ENUM ('EINZELN', 'ZUSAMMEN');

-- CreateTable
CREATE TABLE "PraxisSteuereinstellungen" (
    "id" TEXT NOT NULL,
    "persoenlicherGrenzsteuersatz" DECIMAL(4,2) NOT NULL DEFAULT 42,
    "veranlagungsart" "Veranlagungsart" NOT NULL DEFAULT 'EINZELN',
    "ehepartnerEinkommenJahr" DECIMAL(9,2),
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PraxisSteuereinstellungen_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "PrivaterAbzugKategorie" AS ENUM ('HANDWERKERLEISTUNGEN', 'HAUSHALTSNAHE_DIENSTLEISTUNGEN', 'HAUSHALTSNAHE_BESCHAEFTIGUNG', 'KINDERBETREUUNG', 'SCHULGELD', 'AUSSERGEWOEHNLICHE_BELASTUNG', 'SONSTIGES');

-- CreateTable
CREATE TABLE "PrivaterAbzugKonfiguration" (
    "id" TEXT NOT NULL,
    "kategorie" "PrivaterAbzugKategorie" NOT NULL,
    "prozentsatz" DECIMAL(5,2),
    "deckelJahr" DECIMAL(8,2),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivaterAbzugKonfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivaterAbzugKonfiguration_kategorie_key" ON "PrivaterAbzugKonfiguration"("kategorie");

-- CreateTable
CREATE TABLE "PraxisPrivaterAbzugEintrag" (
    "id" TEXT NOT NULL,
    "kategorie" "PrivaterAbzugKategorie" NOT NULL,
    "jahr" INTEGER NOT NULL,
    "eingegebenerBetrag" DECIMAL(8,2) NOT NULL,
    "berechneterAbzug" DECIMAL(8,2),
    "notiz" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PraxisPrivaterAbzugEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PraxisPrivaterAbzugEintrag_jahr_idx" ON "PraxisPrivaterAbzugEintrag"("jahr");

-- Seed: Steuereinstellungen-Singleton
INSERT INTO "PraxisSteuereinstellungen" ("id", "persoenlicherGrenzsteuersatz", "veranlagungsart", "aktualisiertAm")
VALUES ('singleton', 42, 'EINZELN', now());

-- Seed: gesetzliche Prozentsätze/Deckel je Kategorie (Stand des Prompts, admin-editierbar bei Gesetzesänderung)
INSERT INTO "PrivaterAbzugKonfiguration" ("id", "kategorie", "prozentsatz", "deckelJahr", "erstelltAm") VALUES
    ('konf_handwerkerleistungen', 'HANDWERKERLEISTUNGEN', 20.00, 1200.00, now()),
    ('konf_haushaltsnahe_dienstleistungen', 'HAUSHALTSNAHE_DIENSTLEISTUNGEN', 20.00, 4000.00, now()),
    ('konf_haushaltsnahe_beschaeftigung', 'HAUSHALTSNAHE_BESCHAEFTIGUNG', 20.00, 510.00, now()),
    ('konf_kinderbetreuung', 'KINDERBETREUUNG', 66.67, 4000.00, now()),
    ('konf_schulgeld', 'SCHULGELD', 30.00, 5000.00, now()),
    ('konf_aussergewoehnliche_belastung', 'AUSSERGEWOEHNLICHE_BELASTUNG', NULL, NULL, now()),
    ('konf_sonstiges', 'SONSTIGES', NULL, NULL, now());
