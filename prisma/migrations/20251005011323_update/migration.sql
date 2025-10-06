/*
  Warnings:

  - You are about to drop the `App` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AppInstall` DROP FOREIGN KEY `AppInstall_appId_fkey`;

-- DropIndex
DROP INDEX `AppInstall_appId_fkey` ON `AppInstall`;

-- AlterTable
ALTER TABLE `AppInstall` MODIFY `appId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `App`;
