-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('IN_BEARBEITUNG', 'WARTET_AUF_FREIGABE', 'FREIGEGEBEN', 'KORREKTUR_ANGEFORDERT');

-- CreateTable
CREATE TABLE "MonthlyApproval" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'IN_BEARBEITUNG',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "correctionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyApproval_caseId_idx" ON "MonthlyApproval"("caseId");

-- CreateIndex
CREATE INDEX "MonthlyApproval_status_idx" ON "MonthlyApproval"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyApproval_caseId_year_month_key" ON "MonthlyApproval"("caseId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
