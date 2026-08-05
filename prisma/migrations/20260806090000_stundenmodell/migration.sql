-- AlterTable
ALTER TABLE "User" ADD COLUMN "weeklyWorkDays" INTEGER,
ADD COLUMN "hireDate" DATE,
ADD COLUMN "fondsBasisAtHire" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "aktuelleFondsBasis" DECIMAL(5,2) NOT NULL DEFAULT 70.28;

-- CreateTable
CREATE TABLE "SondertagTyp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "dauerStd" DECIMAL(4,2) NOT NULL,
    "istEchterExtraTag" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SondertagTyp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MitarbeiterPlan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "gueltigAb" DATE NOT NULL,
    "wochenplan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MitarbeiterPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MitarbeiterPlanToSondertagTyp" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "SondertagTyp_datum_idx" ON "SondertagTyp"("datum");

-- CreateIndex
CREATE INDEX "MitarbeiterPlan_employeeId_gueltigAb_idx" ON "MitarbeiterPlan"("employeeId", "gueltigAb");

-- CreateIndex
CREATE UNIQUE INDEX "_MitarbeiterPlanToSondertagTyp_AB_unique" ON "_MitarbeiterPlanToSondertagTyp"("A", "B");

-- CreateIndex
CREATE INDEX "_MitarbeiterPlanToSondertagTyp_B_index" ON "_MitarbeiterPlanToSondertagTyp"("B");

-- AddForeignKey
ALTER TABLE "MitarbeiterPlan" ADD CONSTRAINT "MitarbeiterPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MitarbeiterPlanToSondertagTyp" ADD CONSTRAINT "_MitarbeiterPlanToSondertagTyp_A_fkey" FOREIGN KEY ("A") REFERENCES "MitarbeiterPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MitarbeiterPlanToSondertagTyp" ADD CONSTRAINT "_MitarbeiterPlanToSondertagTyp_B_fkey" FOREIGN KEY ("B") REFERENCES "SondertagTyp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
