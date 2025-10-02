-- 移除 Device 表的 accessType 字段
-- 简化密码逻辑：设备只有有密码或没有密码两种状态

-- 1. 移除 accessType 列
ALTER TABLE `Device` DROP COLUMN `accessType`;

-- 2. 移除 AccessType 枚举（如果数据库支持，MySQL会自动处理）
-- MySQL 不需要显式删除枚举类型