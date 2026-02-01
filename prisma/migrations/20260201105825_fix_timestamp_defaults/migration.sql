-- AlterTable
ALTER TABLE "account" ALTER COLUMN "createdat" SET DEFAULT timezone('Asia/Shanghai', now()),
ALTER COLUMN "updatedat" SET DEFAULT timezone('Asia/Shanghai', now());

-- AlterTable
ALTER TABLE "appinstall" ALTER COLUMN "installedat" SET DEFAULT timezone('Asia/Shanghai', now()),
ALTER COLUMN "updatedat" SET DEFAULT timezone('Asia/Shanghai', now());

-- AlterTable
ALTER TABLE "autoauth" ALTER COLUMN "createdat" SET DEFAULT timezone('Asia/Shanghai', now()),
ALTER COLUMN "updatedat" SET DEFAULT timezone('Asia/Shanghai', now());

-- AlterTable
ALTER TABLE "device" ALTER COLUMN "createdat" SET DEFAULT timezone('Asia/Shanghai', now()),
ALTER COLUMN "updatedat" SET DEFAULT timezone('Asia/Shanghai', now());

-- AlterTable
ALTER TABLE "kvstore" ALTER COLUMN "createdat" SET DEFAULT timezone('Asia/Shanghai', now()),
ALTER COLUMN "updatedat" SET DEFAULT timezone('Asia/Shanghai', now());
