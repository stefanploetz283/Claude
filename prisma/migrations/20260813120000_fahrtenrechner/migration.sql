-- CreateEnum
CREATE TYPE "PrimaerStandort" AS ENUM ('NITTENDORF', 'REGENSBURG');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "wohnortAdresse" TEXT,
ADD COLUMN "wohnortLat" DECIMAL(9,6),
ADD COLUMN "wohnortLng" DECIMAL(9,6),
ADD COLUMN "primaerStandort" "PrimaerStandort" NOT NULL DEFAULT 'NITTENDORF',
ADD COLUMN "einsatzradiusKm" DECIMAL(5,1) NOT NULL DEFAULT 25,
ADD COLUMN "zielFlsStdWocheManuell" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "lat" DECIMAL(9,6),
ADD COLUMN "lng" DECIMAL(9,6),
ADD COLUMN "geocodedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "besucheProWoche" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "geplanteFlsStdWoche" DECIMAL(5,2);
