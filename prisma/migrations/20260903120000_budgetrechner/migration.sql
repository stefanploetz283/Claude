-- CreateTable
CREATE TABLE "BudgetKategorie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "jahresbudget" DECIMAL(10,2) NOT NULL,
    "quelle" TEXT NOT NULL,
    "stichwoerter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetKategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAusgabe" (
    "id" TEXT NOT NULL,
    "betrag" DECIMAL(10,2) NOT NULL,
    "datum" DATE NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "quelle" TEXT NOT NULL,
    "reKoBudgetRelevant" BOOLEAN NOT NULL DEFAULT true,
    "kategorieId" TEXT,
    "importBatchId" TEXT,
    "dedupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAusgabe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetKategorie_jahr_idx" ON "BudgetKategorie"("jahr");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetKategorie_name_jahr_key" ON "BudgetKategorie"("name", "jahr");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAusgabe_dedupKey_key" ON "BudgetAusgabe"("dedupKey");

-- CreateIndex
CREATE INDEX "BudgetAusgabe_datum_idx" ON "BudgetAusgabe"("datum");

-- CreateIndex
CREATE INDEX "BudgetAusgabe_kategorieId_idx" ON "BudgetAusgabe"("kategorieId");

-- AddForeignKey
ALTER TABLE "BudgetAusgabe" ADD CONSTRAINT "BudgetAusgabe_kategorieId_fkey" FOREIGN KEY ("kategorieId") REFERENCES "BudgetKategorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
