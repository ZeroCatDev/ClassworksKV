-- 安全迁移脚本：从第一个版本迁移到当前版本
-- 此脚本保留所有现有数据，使用中间表处理主键变更

-- ====================================
-- 步骤1: 使用中间表迁移 Device 表
-- ====================================

-- 1.1 创建新的 Device_new 表，使用目标结构
CREATE TABLE `Device_new` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `passwordHint` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `accessType` ENUM('PUBLIC', 'PROTECTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `Device_uuid_key`(`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1.2 从旧表迁移数据到新表（自动分配id）
INSERT INTO `Device_new` (`uuid`, `password`, `passwordHint`, `name`, `accessType`, `createdAt`, `updatedAt`)
SELECT `uuid`, `password`, `passwordHint`, `name`, `accessType`, `createdAt`, `updatedAt`
FROM `Device`
ORDER BY `uuid`;

-- ====================================
-- 步骤2: 使用中间表迁移 KVStore 表
-- ====================================

-- 2.1 创建新的 KVStore_new 表，使用目标结构
CREATE TABLE `KVStore_new` (
    `deviceId` INT NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `creatorIp` VARCHAR(191) NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`deviceId`, `key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2.2 从旧表迁移数据到新表（通过uuid映射到id）
INSERT INTO `KVStore_new` (`deviceId`, `key`, `value`, `creatorIp`, `createdAt`, `updatedAt`)
SELECT d.`id`, k.`key`, k.`value`, k.`creatorIp`, k.`createdAt`, k.`updatedAt`
FROM `KVStore` k
INNER JOIN `Device_new` d ON k.`namespace` = d.`uuid`;

-- 2.3 删除旧表
DROP TABLE `KVStore`;

-- 2.4 重命名新表
RENAME TABLE `KVStore_new` TO `KVStore`;

-- ====================================
-- 步骤3: 完成 Device 表迁移
-- ====================================

-- 3.1 删除旧的 Device 表
DROP TABLE `Device`;

-- 3.2 重命名新表
RENAME TABLE `Device_new` TO `Device`;

-- 3.3 为 KVStore 添加外键约束（必须在两个表都重命名后）
ALTER TABLE `KVStore` ADD CONSTRAINT `KVStore_deviceId_fkey`
    FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ====================================
-- 步骤4: 创建 App 表
-- ====================================

CREATE TABLE `App` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `developerName` VARCHAR(191) NOT NULL,
    `developerLink` VARCHAR(191) NULL,
    `homepageLink` VARCHAR(191) NULL,
    `iconHash` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ====================================
-- 步骤5: 创建 AppInstall 表
-- ====================================

CREATE TABLE `AppInstall` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` INT NOT NULL,
    `appId` INT NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppInstall_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5.1 添加外键约束
ALTER TABLE `AppInstall` ADD CONSTRAINT `AppInstall_deviceId_fkey`
    FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AppInstall` ADD CONSTRAINT `AppInstall_appId_fkey`
    FOREIGN KEY (`appId`) REFERENCES `App`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ====================================
-- 迁移完成
-- ====================================