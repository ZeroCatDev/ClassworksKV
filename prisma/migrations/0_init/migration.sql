-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" VARCHAR(191) NOT NULL,
    "provider" VARCHAR(191) NOT NULL,
    "providerId" VARCHAR(191) NOT NULL,
    "email" VARCHAR(191),
    "name" VARCHAR(191),
    "avatarUrl" VARCHAR(191),
    "providerData" JSON,
    "accessToken" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "refreshToken" TEXT,
    "refreshTokenExpiry" TIMESTAMPTZ(6),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "idx_18303_PRIMARY" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInstall" (
    "id" VARCHAR(191) NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "appId" VARCHAR(191) NOT NULL,
    "token" VARCHAR(191) NOT NULL,
    "note" VARCHAR(191),
    "installedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deviceType" VARCHAR(191),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "idx_18310_PRIMARY" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoAuth" (
    "id" VARCHAR(191) NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "password" VARCHAR(191),
    "deviceType" VARCHAR(191),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idx_18317_PRIMARY" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" INTEGER NOT NULL,
    "uuid" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191),
    "accountId" VARCHAR(191),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "password" VARCHAR(191),
    "passwordHint" VARCHAR(191),
    "namespace" VARCHAR(191),

    CONSTRAINT "idx_18324_PRIMARY" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KVStore" (
    "deviceId" INTEGER NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "value" JSON NOT NULL,
    "creatorIp" VARCHAR(191) DEFAULT '',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idx_18330_PRIMARY" PRIMARY KEY ("deviceId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_18303_Account_provider_providerId_key" ON "Account"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18310_AppInstall_token_key" ON "AppInstall"("token");

-- CreateIndex
CREATE INDEX "idx_18310_AppInstall_deviceId_fkey" ON "AppInstall"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18317_AutoAuth_deviceId_password_key" ON "AutoAuth"("deviceId", "password");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18324_Device_uuid_key" ON "Device"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18324_Device_namespace_key" ON "Device"("namespace");

-- CreateIndex
CREATE INDEX "idx_18324_Device_accountId_fkey" ON "Device"("accountId");

-- AddForeignKey
ALTER TABLE "AppInstall" ADD CONSTRAINT "AppInstall_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoAuth" ADD CONSTRAINT "AutoAuth_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KVStore" ADD CONSTRAINT "KVStore_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

