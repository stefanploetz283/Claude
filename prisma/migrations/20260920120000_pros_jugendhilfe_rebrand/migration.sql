-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "practiceName" SET DEFAULT 'PROS Jugendhilfe',
ALTER COLUMN "colorPrimary" SET DEFAULT '#0B3D46',
ALTER COLUMN "colorAccentLight" SET DEFAULT '#F7F3EA';

-- Rebrand: bestehende Einstellungen auf die neuen CI-Werte heben, sofern sie noch
-- unverändert auf den alten Standardwerten stehen (individuelle Anpassungen bleiben erhalten).
UPDATE "Settings" SET "practiceName" = 'PROS Jugendhilfe' WHERE "practiceName" = 'Praxis für Systemische Entwicklung';
UPDATE "Settings" SET "colorPrimary" = '#0B3D46' WHERE "colorPrimary" = '#204D4B';
UPDATE "Settings" SET "colorAccentLight" = '#F7F3EA' WHERE "colorAccentLight" = '#F5F0E8';
