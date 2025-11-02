-- AlterTable
ALTER TABLE `Account` ADD COLUMN `refreshToken` TEXT NULL,
    ADD COLUMN `refreshTokenExpiry` DATETIME(3) NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 1;
