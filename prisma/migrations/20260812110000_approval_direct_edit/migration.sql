-- CreateEnum
CREATE TYPE "ServiceEntryChangeField" AS ENUM ('DATUM', 'ZEIT', 'BEMERKUNG');

-- AlterTable
ALTER TABLE "MonthlyApproval" ADD COLUMN "lastEditedById" TEXT,
ADD COLUMN "lastEditedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ServiceEntryChangeLog" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "field" "ServiceEntryChangeField" NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,

    CONSTRAINT "ServiceEntryChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceEntryChangeLog_entryId_idx" ON "ServiceEntryChangeLog"("entryId");

-- CreateIndex
CREATE INDEX "ServiceEntryChangeLog_changedAt_idx" ON "ServiceEntryChangeLog"("changedAt");

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEntryChangeLog" ADD CONSTRAINT "ServiceEntryChangeLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ServiceEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEntryChangeLog" ADD CONSTRAINT "ServiceEntryChangeLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
