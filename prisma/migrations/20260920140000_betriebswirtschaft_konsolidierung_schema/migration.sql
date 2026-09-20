-- Konsolidierung Betriebswirtschaftstool, Schritt 1/3 (Schema).
-- Rein additiv: keine bestehende Spalte/Tabelle wird geändert oder gelöscht, bestehender Cockpit- und
-- Budgetrechner-Code läuft unverändert weiter. Die Übernahme bestehender Ist-Kosten-/Ausgaben-Zeilen in
-- die neue IstBuchung-Tabelle passiert bewusst NICHT hier per SQL, sondern über das typsichere
-- Admin-Werkzeug unter /admin/budget-migration (siehe dortige Kommentare).

-- AlterEnum
ALTER TYPE "FinomZuordnungsquelle" ADD VALUE 'STICHWORT';

-- AlterTable
ALTER TABLE "BudgetKategorie" ADD COLUMN "kategorie" "KostenKategorie";

-- AlterTable
ALTER TABLE "FinomBuchungRohdaten" ADD COLUMN "zugeordneteBudgetPositionId" TEXT,
ADD COLUMN "budgetZuordnungsquelle" "FinomZuordnungsquelle",
ADD COLUMN "istBuchungId" TEXT;

-- CreateEnum
CREATE TYPE "IstErfassungsart" AS ENUM ('CSV_IMPORT', 'MANUELL');

-- CreateTable
CREATE TABLE "IstBuchung" (
    "id" TEXT NOT NULL,
    "budgetPositionId" TEXT,
    "betrag" DECIMAL(10,2) NOT NULL,
    "datum" DATE NOT NULL,
    "notiz" TEXT,
    "erfassungsart" "IstErfassungsart" NOT NULL,
    "reKoBudgetRelevant" BOOLEAN NOT NULL DEFAULT true,
    "quelle" TEXT,
    "importBatchId" TEXT,
    "dedupKey" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IstBuchung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beleg" (
    "id" TEXT NOT NULL,
    "istBuchungId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "contentType" TEXT,
    "hochgeladenVonId" TEXT NOT NULL,
    "hochgeladenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beleg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IstBuchung_dedupKey_key" ON "IstBuchung"("dedupKey");

-- CreateIndex
CREATE INDEX "IstBuchung_datum_idx" ON "IstBuchung"("datum");

-- CreateIndex
CREATE INDEX "IstBuchung_budgetPositionId_idx" ON "IstBuchung"("budgetPositionId");

-- CreateIndex
CREATE INDEX "Beleg_istBuchungId_idx" ON "Beleg"("istBuchungId");

-- AddForeignKey
ALTER TABLE "Beleg" ADD CONSTRAINT "Beleg_istBuchungId_fkey" FOREIGN KEY ("istBuchungId") REFERENCES "IstBuchung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beleg" ADD CONSTRAINT "Beleg_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
