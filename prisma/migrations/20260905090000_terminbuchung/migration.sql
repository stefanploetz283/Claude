-- CreateEnum
CREATE TYPE "TerminSlotStatus" AS ENUM ('FREI', 'GEBUCHT', 'STORNIERT');

-- CreateEnum
CREATE TYPE "TerminKategorie" AS ENUM ('FALL_TERMIN', 'INTERNER_TERMIN', 'EINZELMASSNAHME');

-- CreateEnum
CREATE TYPE "TerminArt" AS ENUM ('KIND_BERATUNG', 'ELTERN_BERATUNG', 'SCHULHOSPITATION', 'ELTERNKONTAKT', 'SCHULKONTAKT', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "TerminStatus" AS ENUM ('GEPLANT', 'AUSGEFALLEN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "calendarColor" TEXT;

-- CreateTable
CREATE TABLE "Raum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standort" "PrimaerStandort",
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Raum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminWochenvorlage" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "label" TEXT,
    "wochentag" INTEGER NOT NULL,
    "startZeit" TEXT NOT NULL,
    "endZeit" TEXT NOT NULL,
    "slotDauerMinuten" INTEGER NOT NULL,
    "raumId" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminWochenvorlage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminSlot" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vorlageId" TEXT,
    "datum" DATE NOT NULL,
    "startZeit" TIMESTAMP(3) NOT NULL,
    "endZeit" TIMESTAMP(3) NOT NULL,
    "status" "TerminSlotStatus" NOT NULL DEFAULT 'FREI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminSerie" (
    "id" TEXT NOT NULL,
    "rhythmusTage" INTEGER NOT NULL,
    "bisDatum" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminSerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" TEXT NOT NULL,
    "kategorie" "TerminKategorie" NOT NULL,
    "terminArt" "TerminArt",
    "titel" TEXT NOT NULL,
    "caseId" TEXT,
    "einzelmassnahmeBezeichnung" TEXT,
    "employeeId" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "slotId" TEXT,
    "raumId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "TerminStatus" NOT NULL DEFAULT 'GEPLANT',
    "ausfallNotiz" TEXT,
    "serieId" TEXT,
    "note" TEXT,
    "reminderMinutesBefore" INTEGER DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Raum_standort_idx" ON "Raum"("standort");

-- CreateIndex
CREATE INDEX "TerminWochenvorlage_employeeId_aktiv_idx" ON "TerminWochenvorlage"("employeeId", "aktiv");

-- CreateIndex
CREATE UNIQUE INDEX "TerminSlot_employeeId_startZeit_key" ON "TerminSlot"("employeeId", "startZeit");

-- CreateIndex
CREATE INDEX "TerminSlot_employeeId_datum_idx" ON "TerminSlot"("employeeId", "datum");

-- CreateIndex
CREATE INDEX "TerminSlot_status_idx" ON "TerminSlot"("status");

-- CreateIndex
CREATE INDEX "Termin_employeeId_startsAt_idx" ON "Termin"("employeeId", "startsAt");

-- CreateIndex
CREATE INDEX "Termin_caseId_idx" ON "Termin"("caseId");

-- CreateIndex
CREATE INDEX "Termin_raumId_startsAt_idx" ON "Termin"("raumId", "startsAt");

-- CreateIndex
CREATE INDEX "Termin_slotId_idx" ON "Termin"("slotId");

-- CreateIndex
CREATE INDEX "Termin_serieId_idx" ON "Termin"("serieId");

-- CreateIndex
CREATE INDEX "Termin_status_idx" ON "Termin"("status");

-- AddForeignKey
ALTER TABLE "TerminWochenvorlage" ADD CONSTRAINT "TerminWochenvorlage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminWochenvorlage" ADD CONSTRAINT "TerminWochenvorlage_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminSlot" ADD CONSTRAINT "TerminSlot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminSlot" ADD CONSTRAINT "TerminSlot_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "TerminWochenvorlage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TerminSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "TerminSerie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: bestehende Appointment-Zeilen 1:1 als Termin übernehmen (Kategorie aus Fallbezug
-- abgeleitet). Die Appointment-Tabelle selbst bleibt unverändert als Sicherheitsnetz bestehen; die App
-- liest/schreibt sie ab sofort nicht mehr. "location" (Freitext) wird in "note" übernommen, da Termin
-- Räume nur noch über raumId abbildet und die alten Freitext-Orte keinem Raum zuordenbar sind.
INSERT INTO "Termin" (
    "id", "kategorie", "terminArt", "titel", "caseId", "einzelmassnahmeBezeichnung",
    "employeeId", "bookedById", "slotId", "raumId", "startsAt", "endsAt",
    "status", "ausfallNotiz", "serieId", "note", "reminderMinutesBefore", "createdAt", "updatedAt"
)
SELECT
    a."id",
    CASE WHEN a."caseId" IS NOT NULL THEN 'FALL_TERMIN' ELSE 'INTERNER_TERMIN' END::"TerminKategorie",
    NULL,
    a."title",
    a."caseId",
    NULL,
    a."organizerId",
    a."organizerId",
    NULL,
    NULL,
    a."startsAt",
    a."endsAt",
    'GEPLANT'::"TerminStatus",
    NULL,
    NULL,
    NULLIF(
      TRIM(
        COALESCE(a."note", '') ||
        CASE WHEN a."location" IS NOT NULL THEN (CASE WHEN a."note" IS NOT NULL THEN ' · ' ELSE '' END || 'Ort: ' || a."location") ELSE '' END
      ),
      ''
    ),
    a."reminderMinutesBefore",
    a."createdAt",
    a."updatedAt"
FROM "Appointment" a;
