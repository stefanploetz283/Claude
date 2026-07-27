-- AlterEnum
ALTER TYPE "AccessAction" ADD VALUE 'DELETE';

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "contingentPeriodMonths" INTEGER;
