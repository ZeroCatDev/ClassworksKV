# 前端迁移指南

## 概述

本文档描述了后端中间件系统的重构，以及前端需要如何适配这些变化。核心变化是统一了设备信息获取和权限验证流程。

---

## 核心变化

### 1. 统一的设备中间件系统

后端现在使用统一的中间件处理所有与设备UUID相关的操作：

- **`deviceMiddleware`**: 自动获取或创建设备，设备不存在时自动创建
- **`requireWriteAuth`**: 验证写权限，检查设备密码
- **`tokenAuth`**: Token认证，用于应用访问

### 2. 设备自动创建

**重要变化**: 当使用一个新的UUID访问API时，后端会自动创建该设备，无需手动调用创建设备接口。

### 3. 权限模型

- **读操作**: 永远不需要密码
- **写操作**: 如果设备设置了密码则需要验证，否则直接允许

---


## 场景1: 基于UUID的直接访问

适用于：用户直接操作设备数据（设备配置、设备管理等）

### 读操作（无需密码）

**请求方式**: `GET /device/:deviceUuid/*`

**特点**:
- 设备不存在时自动创建
- 无需提供密码
- 任何知道UUID的人都可以读取

**请求示例**:
```http
GET /device/550e8400-e29b-41d4-a716-446655440000/info
Headers:
  x-site-key: your-site-key
```

**成功响应** (200):
```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": null,
  "password": null,
  "passwordHint": null,
  "accountId": null,
  "createdAt": "2025-01-30T10:00:00.000Z",
  "updatedAt": "2025-01-30T10:00:00.000Z"
}
```

### 写操作（需要密码验证）

**请求方式**: `POST|PUT|DELETE /device/:deviceUuid/*`

**特点**:
- 设备不存在时自动创建
- 如果设备设置了密码，必须提供正确密码
- 如果设备没有密码，直接允许写入

#### 密码提供方式

**方式1: 通过请求体（推荐）**

```http
POST /device/550e8400-e29b-41d4-a716-446655440000/config
Headers:
  Content-Type: application/json
  x-site-key: your-site-key
Body:
{
  "password": "device-password",
  "data": {
    "theme": "dark",
    "language": "zh-CN"
  }
}
```

**方式2: 通过查询参数**

```http
POST /device/550e8400-e29b-41d4-a716-446655440000/config?password=device-password
Headers:
  Content-Type: application/json
  x-site-key: your-site-key
Body:
{
  "data": {
    "theme": "dark",
    "language": "zh-CN"
  }
}
```

**成功响应** (200):
```json
{
  "message": "数据已更新",
  "updatedAt": "2025-01-30T10:05:00.000Z"
}
```

**错误响应 - 需要密码** (401):
```json
{
  "statusCode": 401,
  "message": "此操作需要密码",
  "passwordHint": "您的生日（8位数字）"
}
```

**错误响应 - 密码错误** (401):
```json
{
  "statusCode": 401,
  "message": "密码错误"
}
```

---

## 场景2: 基于Token的应用访问

适用于：应用访问KV存储数据

### 步骤1: 获取Token

**请求方式**: `POST /apps/:appId/authorize`

**请求示例**:
```http
POST /apps/1/authorize
Headers:
  Content-Type: application/json
  x-site-key: your-site-key
Body:
{
  "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "password": "device-password",
  "note": "我的应用授权"
}
```

**说明**:
- `deviceUuid`: 必填，设备UUID
- `password`: 如果设备有密码则必填
- `note`: 可选，授权备注

**成功响应** (200):
```json
{
  "token": "clxxx123456789abcdefg",
  "appId": 1,
  "appName": "我的应用",
  "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": null,
  "note": "我的应用授权",
  "authorizedAt": "2025-01-30T10:00:00.000Z"
}
```

**错误响应 - 需要密码** (401):
```json
{
  "statusCode": 401,
  "message": "此操作需要密码",
  "passwordHint": "您的生日（8位数字）"
}
```

### 步骤2: 使用Token访问KV存储

#### Token提供方式

**方式1: Authorization Header（推荐）**
```http
Headers:
  Authorization: Bearer clxxx123456789abcdefg
```

**方式2: Query参数**
```http
?token=clxxx123456789abcdefg
```

**方式3: Request Body**
```json
{
  "token": "clxxx123456789abcdefg",
  ...
}
```

---

### KV API端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/kv` | 列出所有键（含元数据） |
| GET | `/kv/_keys` | 列出所有键名（仅键名） |
| GET | `/kv/:key` | 获取键值 |
| GET | `/kv/:key/metadata` | 获取键元数据 |
| POST | `/kv/:key` | 创建/更新键值 |
| POST | `/kv/_batchimport` | 批量导入 |
| DELETE | `/kv/:key` | 删除键值 |

---

### GET /kv - 列出所有键（含元数据）

**请求示例**:
```http
GET /kv?sortBy=key&sortDir=asc&limit=10&skip=0
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  x-site-key: your-site-key
```

**查询参数**:
- `sortBy`: 排序字段（key/createdAt/updatedAt），默认 key
- `sortDir`: 排序方向（asc/desc），默认 asc
- `limit`: 每页数量，默认 100
- `skip`: 跳过数量，默认 0

**成功响应** (200):
```json
{
  "items": [
    {
      "deviceId": 1,
      "key": "config",
      "metadata": {
        "creatorIp": "192.168.1.1",
        "createdAt": "2025-01-30T10:00:00.000Z",
        "updatedAt": "2025-01-30T10:00:00.000Z"
      }
    },
    {
      "deviceId": 1,
      "key": "user.name",
      "metadata": {
        "creatorIp": "192.168.1.1",
        "createdAt": "2025-01-30T10:01:00.000Z",
        "updatedAt": "2025-01-30T10:01:00.000Z"
      }
    }
  ],
  "total_rows": 25,
  "load_more": "/kv?sortBy=key&sortDir=asc&limit=10&skip=10"
}
```

---

### GET /kv/_keys - 列出所有键名

**请求示例**:
```http
GET /kv/_keys?limit=50&skip=0
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  x-site-key: your-site-key
```

**成功响应** (200):
```json
{
  "keys": ["config", "user.name", "user.theme", "app.settings"],
  "total_rows": 4,
  "current_page": {
    "limit": 50,
    "skip": 0,
    "count": 4
  }
}
```

---

### GET /kv/:key - 获取键值

**请求示例**:
```http
GET /kv/config
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  x-site-key: your-site-key
```

**成功响应** (200):
```json
{
  "theme": "dark",
  "language": "zh-CN",
  "fontSize": 14
}
```

**错误响应 - 键不存在** (404):
```json
{
  "statusCode": 404,
  "message": "未找到键名为 'config' 的记录"
}
```

---

### GET /kv/:key/metadata - 获取键元数据

**请求示例**:
```http
GET /kv/config/metadata
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  x-site-key: your-site-key
```

**成功响应** (200):
```json
{
  "deviceId": 1,
  "key": "config",
  "metadata": {
    "creatorIp": "192.168.1.1",
    "createdAt": "2025-01-30T10:00:00.000Z",
    "updatedAt": "2025-01-30T10:05:00.000Z"
  }
}
```

---

### POST /kv/:key - 创建/更新键值

**请求示例**:
```http
POST /kv/config
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  Content-Type: application/json
  x-site-key: your-site-key
Body:
{
  "theme": "dark",
  "language": "zh-CN",
  "fontSize": 14
}
```

**成功响应** (200):
```json
{
  "deviceId": 1,
  "key": "config",
  "created": false,
  "updatedAt": "2025-01-30T10:10:00.000Z"
}
```

**说明**:
- `created`: true表示新建，false表示更新

**错误响应 - 空值** (400):
```json
{
  "statusCode": 400,
  "message": "请提供有效的JSON值"
}
```

---

### POST /kv/_batchimport - 批量导入

**请求示例**:
```http
POST /kv/_batchimport
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  Content-Type: application/json
  x-site-key: your-site-key
Body:
{
  "config": {
    "theme": "dark",
    "language": "zh-CN"
  },
  "user.name": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "app.settings": {
    "notifications": true
  }
}
```

**成功响应** (200):
```json
{
  "deviceId": 1,
  "total": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "key": "config",
      "created": false
    },
    {
      "key": "user.name",
      "created": true
    },
    {
      "key": "app.settings",
      "created": true
    }
  ]
}
```

**部分失败响应** (200):
```json
{
  "deviceId": 1,
  "total": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "key": "config",
      "created": false
    },
    {
      "key": "user.name",
      "created": true
    }
  ],
  "errors": [
    {
      "key": "app.settings",
      "error": "Invalid value"
    }
  ]
}
```

---

### DELETE /kv/:key - 删除键值

**请求示例**:
```http
DELETE /kv/config
Headers:
  Authorization: Bearer clxxx123456789abcdefg
  x-site-key: your-site-key
```

**成功响应** (204):
```
无响应体
```

**错误响应 - 键不存在** (404):
```json
{
  "statusCode": 404,
  "message": "未找到键名为 'config' 的记录"
}
```

---

## 错误码参考

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 操作成功 |
| 204 | 成功（无内容） | 删除成功 |
| 400 | 请求错误 | 参数缺失或格式错误 |
| 401 | 未授权 | 需要密码、密码错误、Token无效 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 服务器内部错误 |

---

## 401错误详解

### 需要密码
```json
{
  "statusCode": 401,
  "message": "此操作需要密码",
  "passwordHint": "您的生日（8位数字）"
}
```

**处理方式**: 提示用户输入密码，使用 `passwordHint` 作为提示信息

### 密码错误
```json
{
  "statusCode": 401,
  "message": "密码错误"
}
```

**处理方式**: 提示用户密码错误，允许重试

### Token无效
```json
{
  "statusCode": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "statusCode": 401,
  "message": "无效的身份验证令牌"
}
```

**处理方式**: 清除本地Token，引导用户重新授权

---

## 迁移检查清单

### Phase 1: 基础适配
- [ ] 移除手动创建设备的逻辑（设备会自动创建）
- [ ] 更新密码提供方式（从header改为body/query）
- [ ] 实现统一的错误处理
- [ ] 更新API端点路径

### Phase 2: Token集成
- [ ] 实现应用授权流程（POST /apps/:appId/authorize）
- [ ] 集成Token到KV操作
- [ ] 实现Token存储和管理（localStorage）
- [ ] 处理Token过期/无效场景

### Phase 3: 优化
- [ ] 封装统一的API客户端
- [ ] 实现请求重试机制
- [ ] 添加Loading状态管理
- [ ] 优化错误提示用户体验

### Phase 4: 测试
- [ ] 测试设备自动创建
- [ ] 测试密码验证流程（需要密码、密码错误、密码正确）
- [ ] 测试Token授权流程
- [ ] 测试各种错误场景（404、401、400等）

---

## 关键注意事项

### 1. 设备自动创建
- ✅ 无需手动创建设备，首次访问自动创建
- ✅ 简化前端流程，减少API调用
- ⚠️ 确保UUID使用正确的格式（建议使用uuidv4）

### 2. 密码处理
- ✅ 读操作永远不需要密码
- ✅ 写操作只在设备设置了密码时才需要
- ⚠️ 密码通过body或query提供，不要放在header中
- ⚠️ 注意区分"需要密码"和"密码错误"两种情况

### 3. Token管理
- ✅ Token一次获取，可重复使用
- ✅ Token与设备和应用绑定
- ⚠️ Token需要安全存储（localStorage/sessionStorage）
- ⚠️ Token失效时需要重新授权

### 4. Header要求
- 所有请求必须携带 `x-site-key` header
- Token认证使用 `Authorization: Bearer <token>` header（推荐）

---