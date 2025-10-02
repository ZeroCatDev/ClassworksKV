# API 重构文档

## 概述

本次重构将数据库从基于 `namespace` (UUID字符串) 的架构迁移到基于 `deviceId` (自增整数) 的架构，并实现了完整的token授权系统。

## 数据库变更

### Device 表
- **主键变更**: `uuid` (VARCHAR) → `id` (INT AUTO_INCREMENT)
- **uuid**: 改为 UNIQUE 索引
- **新增字段**: `accountId` (用于未来关联社区账户)

### KVStore 表
- **外键变更**: `namespace` (VARCHAR) → `deviceId` (INT)
- **主键**: `(deviceId, key)` 复合主键
- **关联**: 外键关联 `Device.id`，支持级联删除

### 新增表

#### App 表
```sql
CREATE TABLE `App` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191),
  `developerName` VARCHAR(191) NOT NULL,
  `developerLink` VARCHAR(191),
  `homepageLink` VARCHAR(191),
  `iconHash` VARCHAR(191),
  `metadata` JSON,
  `createdAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL
);
```

#### AppInstall 表
```sql
CREATE TABLE `AppInstall` (
  `id` VARCHAR(191) PRIMARY KEY,
  `deviceId` INT NOT NULL,
  `appId` INT NOT NULL,
  `token` VARCHAR(191) UNIQUE NOT NULL,
  `note` VARCHAR(191),
  `installedAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appId`) REFERENCES `App`(`id`) ON DELETE CASCADE
);
```

## API 架构

### 1. 应用授权流程

#### POST /apps/:appId/authorize
为应用获取访问token

**请求体:**
```json
{
  "deviceUuid": "设备UUID",
  "password": "设备密码（如需要）",
  "readOnly": false,
  "note": "备注信息"
}
```

**响应:**
```json
{
  "token": "生成的访问token",
  "appId": 1,
  "appName": "应用名称",
  "deviceUuid": "设备UUID",
  "deviceName": "设备名称",
  "readOnly": false,
  "note": "读写访问",
  "authorizedAt": "2025-01-01T00:00:00.000Z"
}
```

### 2. Token-based KV 操作（唯一方式）

⚠️ **重要变更**: 所有KV操作现在仅支持基于token的访问，旧的 `/kv/:namespace/:key` API已移除。

#### Token提供方式
1. Authorization Header: `Authorization: Bearer <token>`
2. Query 参数: `?token=<token>`
3. Request Body: `{"token": "<token>"}`

#### KV API端点
```
GET /kv              - 列出所有键（含元数据）
GET /kv/_keys        - 列出所有键名（仅键名）
GET /kv/:key         - 获取键值
GET /kv/:key/metadata - 获取键元数据
POST /kv/:key        - 创建/更新键值
POST /kv/_batchimport - 批量导入
DELETE /kv/:key      - 删除键值
```

### 3. 主要接口

#### 应用管理
- `GET /apps` - 获取应用列表
- `GET /apps/:id` - 获取应用详情
- `POST /apps/:id/authorize` - 授权应用获取token
- `GET /apps/:id/installations` - 获取应用的所有安装记录

#### Token管理
- `GET /apps/devices/:deviceUuid/tokens` - 获取设备的所有token
- `DELETE /apps/tokens/:token` - 撤销token

#### KV操作（仅Token方式）
- `GET /kv` - 列出所有键（含元数据）
- `GET /kv/_keys` - 列出所有键名（仅键名）
- `GET /kv/:key` - 获取键值
- `GET /kv/:key/metadata` - 获取键元数据
- `POST /kv/:key` - 创建/更新键值
- `POST /kv/_batchimport` - 批量导入
- `DELETE /kv/:key` - 删除键值

## 使用示例

### 1. 授权应用
```javascript
const response = await fetch('http://localhost:3000/apps/1/authorize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-site-key': 'your-site-key'
  },
  body: JSON.stringify({
    deviceUuid: 'your-device-uuid',
    password: 'device-password-if-needed',
    readOnly: false,
    note: '我的应用授权'
  })
});

const { token } = await response.json();
```

### 2. 使用Token读取KV
```javascript
const response = await fetch('http://localhost:3000/kv/mykey', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-site-key': 'your-site-key'
  }
});

const value = await response.json();
```

### 3. 使用Token写入KV
```javascript
const response = await fetch('http://localhost:3000/kv/mykey', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-site-key': 'your-site-key'
  },
  body: JSON.stringify({
    data: 'my value',
    timestamp: Date.now()
  })
});
```

## 迁移指南

### 数据库迁移

1. 标记旧迁移为已应用：
```bash
npx prisma migrate resolve --applied 20250524123414_2025_05_25
```

2. 执行新迁移：
```bash
npx prisma migrate deploy
```

### 代码更新

⚠️ **破坏性变更**: 旧的基于namespace的API已完全移除。

**旧代码（不再支持）:**
```javascript
// ❌ 已移除
GET /kv/:namespace/:key
POST /kv/:namespace/:key
DELETE /kv/:namespace/:key
```

**新代码（唯一方式）:**
```javascript
// ✅ 使用token-based API
GET /kv/:key
POST /kv/:key
DELETE /kv/:key

// 必须在header中提供token
Headers: {
  'Authorization': 'Bearer <token>',
  'x-site-key': 'your-site-key'
}
```

**迁移步骤:**
1. 为每个需要访问KV的应用调用 `POST /apps/:id/authorize` 获取token
2. 将所有KV API调用从 `/kv/:namespace/:key` 改为 `/kv/:key`
3. 在所有请求中添加 `Authorization: Bearer <token>` header
4. 测试确保所有功能正常

## 优势

1. **安全性提升**: Token-based认证，无需在URL中暴露namespace
2. **多设备支持**: 同一UUID可在不同设备上使用不同token
3. **细粒度权限**: 可为每个应用授权只读或读写权限
4. **易于管理**: 可随时撤销token，不影响其他授权
5. **性能优化**: 使用整数ID作为外键，查询效率更高
6. **简化API**: 统一的token认证方式，无需在URL中指定namespace