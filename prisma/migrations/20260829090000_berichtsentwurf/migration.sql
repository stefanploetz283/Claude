-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "berichtLeistungsnachweisSchwellenwert" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "AbschlussberichtEntwurf" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "manualVersionId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'IN_BEARBEITUNG',
    "generiertAm" TIMESTAMP(3) NOT NULL,
    "generiertVonId" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "correctionNote" TEXT,
    "lastEditedById" TEXT,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbschlussberichtEntwurf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbschlussberichtEntwurf_caseId_key" ON "AbschlussberichtEntwurf"("caseId");

-- CreateIndex
CREATE INDEX "AbschlussberichtEntwurf_status_idx" ON "AbschlussberichtEntwurf"("status");

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_manualVersionId_fkey" FOREIGN KEY ("manualVersionId") REFERENCES "BerichtsManualVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_generiertVonId_fkey" FOREIGN KEY ("generiertVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbschlussberichtEntwurf" ADD CONSTRAINT "AbschlussberichtEntwurf_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
