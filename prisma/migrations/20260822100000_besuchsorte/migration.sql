-- CreateTable
CREATE TABLE "Besuchsort" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "geocodedAt" TIMESTAMP(3),
    "besucheProMonat" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Besuchsort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Besuchsort_caseId_idx" ON "Besuchsort"("caseId");

-- AddForeignKey
ALTER TABLE "Besuchsort" ADD CONSTRAINT "Besuchsort_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: jeder bestehende Fall bekommt genau einen Besuchsort "Zuhause". Adresse/Koordinaten werden
-- 1:1 vom bereits geocodierten Client übernommen (kein erneuter Nominatim-Aufruf), besucheProWoche wird
-- auf Besuche/Monat hochgerechnet (× 4.33, Wochen/Monat - dieselbe Umrechnung wie im Fahrten-/Fallrechner).
INSERT INTO "Besuchsort" ("id", "caseId", "bezeichnung", "adresse", "lat", "lng", "geocodedAt", "besucheProMonat", "sortOrder", "createdAt", "updatedAt")
SELECT
    'legacy_' || c."id",
    c."id",
    'Zuhause',
    COALESCE(NULLIF(CONCAT_WS(', ', cl."street", cl."postalCodeCity"), ''), cl."address", ''),
    cl."lat",
    cl."lng",
    cl."geocodedAt",
    ROUND(c."besucheProWoche" * 4.33, 2),
    0,
    now(),
    now()
FROM "Case" c
JOIN "Client" cl ON cl."id" = c."clientId";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "besucheProWoche";
