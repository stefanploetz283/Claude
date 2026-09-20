-- CreateTable
CREATE TABLE "Aufgabe" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "faelligAm" DATE,
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "erledigtAm" TIMESTAMP(3),
    "zugewiesenAnId" TEXT NOT NULL,
    "erstelltVonId" TEXT NOT NULL,
    "caseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aufgabe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aufgabe_zugewiesenAnId_erledigt_idx" ON "Aufgabe"("zugewiesenAnId", "erledigt");

-- CreateIndex
CREATE INDEX "Aufgabe_faelligAm_idx" ON "Aufgabe"("faelligAm");

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
