-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'CONVERTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "expectedEndDate" TIMESTAMP(3),
ADD COLUMN     "phaseOutWeeks" INTEGER;

-- AlterTable
ALTER TABLE "HelpType" ADD COLUMN     "defaultDurationWeeks" INTEGER,
ADD COLUMN     "defaultTotalHoursMax" DECIMAL(6,2),
ADD COLUMN     "defaultTotalHoursMin" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "ServiceEntry" ADD COLUMN     "activityProfileId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "billableCapacityFactor" DECIMAL(4,2) NOT NULL DEFAULT 0.75,
ADD COLUMN     "defaultPhaseOutWeeks" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "targetParallelCasesAtFullTime" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyContractHours" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "HelpTypeActivityProfile" (
    "id" TEXT NOT NULL,
    "helpTypeId" TEXT NOT NULL,
    "activityLabel" TEXT NOT NULL,
    "hoursPerWeek" DECIMAL(5,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpTypeActivityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "authority" TEXT,
    "helpTypeId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urgencyNote" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "matchedCaseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeAllowedHelpTypes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeAllowedHelpTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "HelpTypeActivityProfile_helpTypeId_idx" ON "HelpTypeActivityProfile"("helpTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_matchedCaseId_key" ON "WaitlistEntry"("matchedCaseId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_helpTypeId_idx" ON "WaitlistEntry"("helpTypeId");

-- CreateIndex
CREATE INDEX "_EmployeeAllowedHelpTypes_B_index" ON "_EmployeeAllowedHelpTypes"("B");

-- AddForeignKey
ALTER TABLE "HelpTypeActivityProfile" ADD CONSTRAINT "HelpTypeActivityProfile_helpTypeId_fkey" FOREIGN KEY ("helpTypeId") REFERENCES "HelpType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_helpTypeId_fkey" FOREIGN KEY ("helpTypeId") REFERENCES "HelpType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_matchedCaseId_fkey" FOREIGN KEY ("matchedCaseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEntry" ADD CONSTRAINT "ServiceEntry_activityProfileId_fkey" FOREIGN KEY ("activityProfileId") REFERENCES "HelpTypeActivityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeAllowedHelpTypes" ADD CONSTRAINT "_EmployeeAllowedHelpTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "HelpType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeAllowedHelpTypes" ADD CONSTRAINT "_EmployeeAllowedHelpTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
