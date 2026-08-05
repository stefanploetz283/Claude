-- CreateEnum
CREATE TYPE "GutscheinAnbieter" AS ENUM ('EDEKA', 'DM', 'MEDIAMARKT');

-- CreateTable
CREATE TABLE "BetriebsferienPeriod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetriebsferienPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GutscheinAuswahl" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "anbieter" "GutscheinAnbieter" NOT NULL,
    "beschafft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GutscheinAuswahl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyBonusPayout" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "paidOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidOutById" TEXT NOT NULL,

    CONSTRAINT "QuarterlyBonusPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BetriebsferienPeriod_startDate_endDate_idx" ON "BetriebsferienPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "GutscheinAuswahl_year_month_idx" ON "GutscheinAuswahl"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "GutscheinAuswahl_employeeId_year_month_key" ON "GutscheinAuswahl"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyBonusPayout_employeeId_year_quarter_key" ON "QuarterlyBonusPayout"("employeeId", "year", "quarter");

-- AddForeignKey
ALTER TABLE "GutscheinAuswahl" ADD CONSTRAINT "GutscheinAuswahl_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyBonusPayout" ADD CONSTRAINT "QuarterlyBonusPayout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyBonusPayout" ADD CONSTRAINT "QuarterlyBonusPayout_paidOutById_fkey" FOREIGN KEY ("paidOutById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
