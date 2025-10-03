-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `providerData` JSON NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Account_accessToken_key`(`accessToken`),
    UNIQUE INDEX `Account_provider_providerId_key`(`provider`, `providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
