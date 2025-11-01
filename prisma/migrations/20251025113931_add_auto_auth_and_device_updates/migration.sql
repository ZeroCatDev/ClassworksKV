/*
  Warnings:

  - A unique constraint covering the columns `[namespace]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `AppInstall` ADD COLUMN `deviceType` VARCHAR(191) NULL,
    ADD COLUMN `isReadOnly` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Device` ADD COLUMN `namespace` VARCHAR(191) NULL;

-- 将所有设备的 namespace 设置为对应的 uuid 值，避免唯一键冲突
UPDATE `Device` SET `namespace` = `uuid` WHERE `namespace` IS NULL;

-- CreateTable
CREATE TABLE `AutoAuth` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` INTEGER NOT NULL,
    `password` VARCHAR(191) NULL,
    `deviceType` VARCHAR(191) NULL,
    `isReadOnly` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AutoAuth_deviceId_password_key`(`deviceId`, `password`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 为每个设备创建默认的 AutoAuth 记录，将 Device.password 复制为 AutoAuth.password
INSERT INTO `AutoAuth` (`id`, `deviceId`, `password`, `deviceType`, `isReadOnly`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('autoauth_', UUID()),
    `id`,
    `password`,
    NULL,
    false,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Device`;

-- CreateIndex
CREATE UNIQUE INDEX `Device_namespace_key` ON `Device`(`namespace`);

-- AddForeignKey
ALTER TABLE `AutoAuth` ADD CONSTRAINT `AutoAuth_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
