-- CreateEnum
CREATE TYPE "FinomZuordnungsquelle" AS ENUM ('IBAN', 'FINOM_KATEGORIE', 'BELEG_FALLBACK', 'MANUELL');

-- CreateEnum
CREATE TYPE "FinomBuchungStatus" AS ENUM ('ZUGEORDNET', 'ZU_KLAEREN', 'IGNORIERT');

-- CreateTable
CREATE TABLE "FinomEmpfaengerZuordnung" (
    "id" TEXT NOT NULL,
    "empfaengerNameOderIban" TEXT NOT NULL,
    "kategorie" "KostenKategorie",
    "unterkategorie" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinomEmpfaengerZuordnung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinomEmpfaengerZuordnung_empfaengerNameOderIban_idx" ON "FinomEmpfaengerZuordnung"("empfaengerNameOderIban");

-- CreateTable
CREATE TABLE "FinomKategorieMapping" (
    "id" TEXT NOT NULL,
    "finomKategorieBezeichnung" TEXT NOT NULL,
    "praxisKategorie" "KostenKategorie" NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinomKategorieMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinomKategorieMapping_finomKategorieBezeichnung_key" ON "FinomKategorieMapping"("finomKategorieBezeichnung");

-- CreateTable
CREATE TABLE "FinomBuchungRohdaten" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "betrag" DECIMAL(10,2) NOT NULL,
    "empfaengerName" TEXT,
    "empfaengerIban" TEXT,
    "verwendungszweck" TEXT,
    "finomKategorie" TEXT,
    "hatBeleg" BOOLEAN,
    "zugeordneteKategorie" "KostenKategorie",
    "zuordnungsquelle" "FinomZuordnungsquelle",
    "status" "FinomBuchungStatus" NOT NULL DEFAULT 'ZU_KLAEREN',
    "istKostenEintragId" TEXT,
    "importBatchId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinomBuchungRohdaten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinomBuchungRohdaten_datum_idx" ON "FinomBuchungRohdaten"("datum");
CREATE INDEX "FinomBuchungRohdaten_status_idx" ON "FinomBuchungRohdaten"("status");
CREATE INDEX "FinomBuchungRohdaten_importBatchId_idx" ON "FinomBuchungRohdaten"("importBatchId");

-- CreateTable
CREATE TABLE "FinomCsvSpaltenzuordnung" (
    "id" TEXT NOT NULL,
    "datumSpalte" TEXT NOT NULL,
    "betragSpalte" TEXT NOT NULL,
    "empfaengerNameSpalte" TEXT,
    "empfaengerIbanSpalte" TEXT,
    "verwendungszweckSpalte" TEXT,
    "finomKategorieSpalte" TEXT,
    "belegSpalte" TEXT,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinomCsvSpaltenzuordnung_pkey" PRIMARY KEY ("id")
);
