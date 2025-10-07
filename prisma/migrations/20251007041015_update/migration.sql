-- DropIndex
DROP INDEX `Account_accessToken_key` ON `Account`;

-- AlterTable
ALTER TABLE `Account` MODIFY `accessToken` TEXT NOT NULL;
