-- CreateTable
CREATE TABLE "MonthlyProcessNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyProcessNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyProcessNote_caseId_idx" ON "MonthlyProcessNote"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyProcessNote_caseId_year_month_key" ON "MonthlyProcessNote"("caseId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyProcessNote" ADD CONSTRAINT "MonthlyProcessNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
