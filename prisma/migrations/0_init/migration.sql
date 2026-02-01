-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "account" (
    "id" VARCHAR(191) NOT NULL,
    "provider" VARCHAR(191) NOT NULL,
    "providerid" VARCHAR(191) NOT NULL,
    "email" VARCHAR(191),
    "name" VARCHAR(191),
    "avatarurl" VARCHAR(191),
    "providerdata" JSON,
    "accesstoken" TEXT,
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,
    "refreshtoken" TEXT,
    "refreshtokenexpiry" TIMESTAMPTZ(6),
    "tokenversion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "idx_18048_primary" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appinstall" (
    "id" VARCHAR(191) NOT NULL,
    "deviceid" INTEGER NOT NULL,
    "appid" VARCHAR(191) NOT NULL,
    "token" VARCHAR(191) NOT NULL,
    "note" VARCHAR(191),
    "installedat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,
    "devicetype" VARCHAR(191),
    "isreadonly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "idx_18055_primary" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autoauth" (
    "id" VARCHAR(191) NOT NULL,
    "deviceid" INTEGER NOT NULL,
    "password" VARCHAR(191),
    "devicetype" VARCHAR(191),
    "isreadonly" BOOLEAN NOT NULL DEFAULT false,
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idx_18062_primary" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" INTEGER NOT NULL,
    "uuid" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191),
    "accountid" VARCHAR(191),
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,
    "password" VARCHAR(191),
    "passwordhint" VARCHAR(191),
    "namespace" VARCHAR(191),

    CONSTRAINT "idx_18069_primary" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kvstore" (
    "deviceid" INTEGER NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "value" JSON NOT NULL,
    "creatorip" VARCHAR(191) DEFAULT '',
    "createdat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idx_18075_primary" PRIMARY KEY ("deviceid","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_18048_account_provider_providerid_key" ON "account"("provider", "providerid");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18055_appinstall_token_key" ON "appinstall"("token");

-- CreateIndex
CREATE INDEX "idx_18055_appinstall_deviceid_fkey" ON "appinstall"("deviceid");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18062_autoauth_deviceid_password_key" ON "autoauth"("deviceid", "password");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18069_device_uuid_key" ON "device"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "idx_18069_device_namespace_key" ON "device"("namespace");

-- CreateIndex
CREATE INDEX "idx_18069_device_accountid_fkey" ON "device"("accountid");

-- AddForeignKey
ALTER TABLE "appinstall" ADD CONSTRAINT "appinstall_deviceid_fkey" FOREIGN KEY ("deviceid") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autoauth" ADD CONSTRAINT "autoauth_deviceid_fkey" FOREIGN KEY ("deviceid") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_accountid_fkey" FOREIGN KEY ("accountid") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kvstore" ADD CONSTRAINT "kvstore_deviceid_fkey" FOREIGN KEY ("deviceid") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

