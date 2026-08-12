-- CreateEnum
CREATE TYPE "InterimAngebotsart" AS ENUM ('ERZIEHUNGSBEISTANDSCHAFT', 'PROS');

-- CreateTable
CREATE TABLE "InterimCase" (
    "id" TEXT NOT NULL,
    "angebotsart" "InterimAngebotsart" NOT NULL,
    "familienname" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "strasseHausnummer" TEXT NOT NULL,
    "plzOrt" TEXT NOT NULL,
    "sachbearbeiterSpfd" TEXT NOT NULL,
    "bewilligteWochenstunden" DECIMAL(6,2) NOT NULL,
    "honorarProStunde" DECIMAL(7,2) NOT NULL,
    "leistungserbringer" TEXT NOT NULL DEFAULT 'Stefan Plötz',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterimCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterimEntry" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterimEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterimEntry_caseId_idx" ON "InterimEntry"("caseId");

-- CreateIndex
CREATE INDEX "InterimEntry_date_idx" ON "InterimEntry"("date");

-- AddForeignKey
ALTER TABLE "InterimEntry" ADD CONSTRAINT "InterimEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InterimCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
