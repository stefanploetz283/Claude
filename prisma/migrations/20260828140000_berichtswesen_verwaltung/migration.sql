-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "berichtReferenzberichteMaxAnzahl" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "BerichtsManualVersion" (
    "id" TEXT NOT NULL,
    "helpTypeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltVonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BerichtsManualVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PraxisFachlicheKonzeption" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "text" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PraxisFachlicheKonzeption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PraxisGlossarBegriff" (
    "id" TEXT NOT NULL,
    "begriff" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PraxisGlossarBegriff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referenzbericht" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "freigegeben" BOOLEAN NOT NULL DEFAULT false,
    "erstelltVonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referenzbericht_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BerichtsManualVersion_helpTypeId_createdAt_idx" ON "BerichtsManualVersion"("helpTypeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PraxisGlossarBegriff_begriff_key" ON "PraxisGlossarBegriff"("begriff");

-- CreateIndex
CREATE INDEX "Referenzbericht_freigegeben_createdAt_idx" ON "Referenzbericht"("freigegeben", "createdAt");

-- AddForeignKey
ALTER TABLE "BerichtsManualVersion" ADD CONSTRAINT "BerichtsManualVersion_helpTypeId_fkey" FOREIGN KEY ("helpTypeId") REFERENCES "HelpType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BerichtsManualVersion" ADD CONSTRAINT "BerichtsManualVersion_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referenzbericht" ADD CONSTRAINT "Referenzbericht_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: die im Prompt (Teil 2/3 Punkt 8) fest vorgegebenen Mindest-Begriffe des Begriffsglossars.
INSERT INTO "PraxisGlossarBegriff" ("id", "begriff", "definition", "sortOrder", "createdAt", "updatedAt") VALUES
('seed_glossar_regulation', 'Regulation', 'Die Fähigkeit von Systemen, mit Anforderungen, Belastungen und Veränderungen umzugehen.', 0, now(), now()),
('seed_glossar_passung', 'Passung', 'Die Qualität der Beziehung und des Zusammenwirkens zwischen beteiligten Systemen [...] kein Schwarz-Weiß-Zustand, sondern ein dynamischer Grad der Übereinstimmung [...] Ziel ist nicht die Herstellung perfekter Passung, sondern eines Passungsgrades, den die beteiligten Systeme als ausreichend erleben.', 1, now(), now()),
('seed_glossar_koregulation', 'Ko-Regulation', 'Das Zusammenspiel zwischen eigener Regulation und Passung zu anderen Systemen.', 2, now(), now()),
('seed_glossar_triade', 'Triade', 'Die für den jeweiligen Fall relevante systemische Dreier-Konstellation, aus der sich die zu betrachtenden Wechselwirkungen ergeben.', 3, now(), now()),
('seed_glossar_wuerdigung', 'Würdigung', 'Grundhaltung, die Menschen nicht über ihre Probleme definiert, sondern als Menschen mit Erfahrungen, Fähigkeiten und Entwicklungsmöglichkeiten wahrnimmt, einschließlich Würdigung bereits entwickelter Lösungs- und Regulationsversuche.', 4, now(), now());
