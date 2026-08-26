-- CreateEnum
CREATE TYPE "KostenKategorie" AS ENUM ('PERSONALKOSTEN', 'RAUMKOSTEN', 'VERWALTUNGSSACHKOSTEN', 'SONSTIGE_KOSTEN_AFA');

-- CreateTable
CREATE TABLE "PraxisKalkulation" (
    "id" TEXT NOT NULL,
    "gueltigAb" DATE NOT NULL,
    "geplantePersonalkostenJahr" DECIMAL(10,2) NOT NULL,
    "geplanteRaumkostenJahr" DECIMAL(10,2) NOT NULL,
    "geplanteVerwaltungssachkostenJahr" DECIMAL(10,2) NOT NULL,
    "geplanteSonstigeKostenAfaJahr" DECIMAL(10,2) NOT NULL,
    "zielQuote" DECIMAL(4,3) NOT NULL DEFAULT 0.75,
    "verfuegbarkeitsquote" DECIMAL(4,3) NOT NULL DEFAULT 0.769,
    "zielFaktor" DECIMAL(4,2) NOT NULL DEFAULT 2.2,
    "mindestFaktorSteuerberater" DECIMAL(4,2) NOT NULL DEFAULT 2.1,
    "stundensatzBasis" DECIMAL(7,2) NOT NULL,
    "zielFlsStdJahr" DECIMAL(8,2) NOT NULL,
    "zahlungsverzugTageJugendamt" INTEGER NOT NULL DEFAULT 45,
    "quelle" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PraxisKalkulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PraxisKalkulation_gueltigAb_idx" ON "PraxisKalkulation"("gueltigAb");

-- CreateTable
CREATE TABLE "IstKostenEintrag" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "kategorie" "KostenKategorie" NOT NULL,
    "unterkategorie" TEXT,
    "betrag" DECIMAL(10,2) NOT NULL,
    "belegReferenz" TEXT,
    "quelle" TEXT NOT NULL DEFAULT 'manuell',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IstKostenEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IstKostenEintrag_datum_idx" ON "IstKostenEintrag"("datum");
CREATE INDEX "IstKostenEintrag_kategorie_idx" ON "IstKostenEintrag"("kategorie");

-- CreateTable
CREATE TABLE "LiquiditaetsEintrag" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "verfuegbareLiquideMittel" DECIMAL(10,2) NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiquiditaetsEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiquiditaetsEintrag_datum_idx" ON "LiquiditaetsEintrag"("datum");

-- Backfill: eine initiale Kalkulationsversion aus den bisherigen (jetzt entfernten) Settings-Feldern des
-- Umsatz-Cockpits ableiten. Die bisherigen Felder kannten keine Aufteilung von "Gesamtkosten" in Personal-/
-- Betriebskosten und keine ZIEL_FLS_STD_JAHR - diese Werte werden auf 0 vorbelegt und müssen im neuen
-- Cockpit einmalig nachgetragen werden (siehe "quelle"-Hinweis unten).
INSERT INTO "PraxisKalkulation" (
    "id", "gueltigAb", "geplantePersonalkostenJahr", "geplanteRaumkostenJahr",
    "geplanteVerwaltungssachkostenJahr", "geplanteSonstigeKostenAfaJahr",
    "zielQuote", "verfuegbarkeitsquote", "zielFaktor", "mindestFaktorSteuerberater",
    "stundensatzBasis", "zielFlsStdJahr", "zahlungsverzugTageJugendamt", "quelle", "erstelltAm"
)
SELECT
    'legacy_kalkulation',
    CURRENT_DATE,
    0,
    COALESCE(s."gesamtkostenJahr", 0),
    0,
    0,
    0.75,
    0.769,
    COALESCE(s."zielFaktor", 2.2),
    COALESCE(s."mindestFaktorSteuerberater", 2.1),
    COALESCE(s."hourlyRate", 110),
    0,
    COALESCE(s."zahlungsverzugTageJugendamt", 45),
    'Migriert aus altem Umsatz-Cockpit - Personalkosten/Raum-/Verwaltungssachkosten/Sonstige Kosten sowie Ziel-FLS-Std./Jahr bitte im Betriebswirtschaftlichen Cockpit korrigieren/ergänzen',
    now()
FROM "Settings" s
WHERE s.id = 'singleton';

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN IF EXISTS "stundensatzVnb",
DROP COLUMN IF EXISTS "zielFaktor",
DROP COLUMN IF EXISTS "mindestFaktorSteuerberater",
DROP COLUMN IF EXISTS "breakEvenStundensatz",
DROP COLUMN IF EXISTS "gesamtkostenJahr",
DROP COLUMN IF EXISTS "zahlungsverzugTageJugendamt";
