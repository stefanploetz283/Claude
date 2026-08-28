-- CreateEnum
CREATE TYPE "BerichtsKapitel" AS ENUM ('AUSGANGSLAGE', 'VERSTEHEN', 'ERKENNEN', 'VERSTAENDIGEN', 'VERAENDERN', 'STABILISIEREN', 'REGULATION_PASSUNG', 'PERSPEKTIVE');

-- CreateEnum
CREATE TYPE "BerichtsbausteinStatus" AS ENUM ('GESAMMELT', 'IM_BERICHT_VERARBEITET');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "triade" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fallfuehrendeFachkraftId" TEXT;

-- CreateTable
CREATE TABLE "Berichtsbaustein" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "erstellerId" TEXT NOT NULL,
    "erfassungszeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originaltext" TEXT NOT NULL,
    "vorlaeufigeKategorie" "BerichtsKapitel",
    "bezugBausteinId" TEXT,
    "triadeZuordnung" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "BerichtsbausteinStatus" NOT NULL DEFAULT 'GESAMMELT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Berichtsbaustein_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Berichtsbaustein_caseId_idx" ON "Berichtsbaustein"("caseId");

-- CreateIndex
CREATE INDEX "Berichtsbaustein_erstellerId_idx" ON "Berichtsbaustein"("erstellerId");

-- CreateIndex
CREATE INDEX "Berichtsbaustein_bezugBausteinId_idx" ON "Berichtsbaustein"("bezugBausteinId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_fallfuehrendeFachkraftId_fkey" FOREIGN KEY ("fallfuehrendeFachkraftId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berichtsbaustein" ADD CONSTRAINT "Berichtsbaustein_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berichtsbaustein" ADD CONSTRAINT "Berichtsbaustein_erstellerId_fkey" FOREIGN KEY ("erstellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berichtsbaustein" ADD CONSTRAINT "Berichtsbaustein_bezugBausteinId_fkey" FOREIGN KEY ("bezugBausteinId") REFERENCES "Berichtsbaustein"("id") ON DELETE SET NULL ON UPDATE CASCADE;
