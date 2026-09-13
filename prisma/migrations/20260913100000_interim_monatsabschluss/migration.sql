-- CreateEnum
CREATE TYPE "MonatsabschlussStatus" AS ENUM ('OFFEN', 'ABGESCHLOSSEN');

-- CreateTable
CREATE TABLE "Monatsabschluss" (
    "id" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "monat" INTEGER NOT NULL,
    "status" "MonatsabschlussStatus" NOT NULL DEFAULT 'ABGESCHLOSSEN',
    "abgeschlossenAm" TIMESTAMP(3) NOT NULL,
    "abgeschlossenVonId" TEXT NOT NULL,
    "wiederGeoeffnetAm" TIMESTAMP(3),
    "wiederGeoeffnetVonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monatsabschluss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Monatsabschluss_jahr_monat_key" ON "Monatsabschluss"("jahr", "monat");

-- AddForeignKey
ALTER TABLE "Monatsabschluss" ADD CONSTRAINT "Monatsabschluss_abgeschlossenVonId_fkey" FOREIGN KEY ("abgeschlossenVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monatsabschluss" ADD CONSTRAINT "Monatsabschluss_wiederGeoeffnetVonId_fkey" FOREIGN KEY ("wiederGeoeffnetVonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
