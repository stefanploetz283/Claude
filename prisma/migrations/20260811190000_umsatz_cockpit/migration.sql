-- AlterTable
ALTER TABLE "Case" ADD COLUMN "stundensatz" DECIMAL(7,2);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "stundensatzVnb" DECIMAL(7,2) NOT NULL DEFAULT 115,
ADD COLUMN "zielFaktor" DECIMAL(4,2) NOT NULL DEFAULT 2.2,
ADD COLUMN "mindestFaktorSteuerberater" DECIMAL(4,2) NOT NULL DEFAULT 2.1,
ADD COLUMN "breakEvenStundensatz" DECIMAL(7,2) NOT NULL DEFAULT 56,
ADD COLUMN "gesamtkostenJahr" DECIMAL(10,2),
ADD COLUMN "zahlungsverzugTageJugendamt" INTEGER NOT NULL DEFAULT 45;
