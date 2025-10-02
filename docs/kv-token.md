# KV 存储 Token API

本文档描述了基于令牌的 KV 存储 API。这些 API 端点使用应用程序安装令牌进行身份验证，而不是直接使用设备 UUID。

## 身份验证

所有请求都需要提供一个有效的应用程序安装令牌。令牌可以通过以下方式之一提供：

1. **Authorization Header**:
```
Authorization: Bearer YOUR_TOKEN
```

2. **Query Parameter**:
```
?token=YOUR_TOKEN
```

3. **Request Body**:
```json
{
  "token": "YOUR_TOKEN"
}
```

## API 端点

### 列出键名

获取命名空间下的所有键名（不包括值）。

```http
GET /kv/token/_keys
```

查询参数：
- `sortBy`: 排序字段（默认：'key'）
- `sortDir`: 排序方向（'asc' 或 'desc'，默认：'asc'）
- `limit`: 每页记录数（默认：100）
- `skip`: 跳过的记录数（默认：0）

响应示例：
```json
{
  "keys": ["key1", "key2", "key3"],
  "total_rows": 3,
  "current_page": {
    "limit": 100,
    "skip": 0,
    "count": 3
  }
}
```

### 列出所有键值对

获取命名空间下的所有键值对及其元数据。

```http
GET /kv/token/
```

查询参数：
- `sortBy`: 排序字段（默认：'key'）
- `sortDir`: 排序方向（'asc' 或 'desc'，默认：'asc'）
- `limit`: 每页记录数（默认：100）
- `skip`: 跳过的记录数（默认：0）

响应示例：
```json
{
  "items": [
    {
      "key": "key1",
      "value": { "data": "value1" },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total_rows": 1
}
```

### 获取单个键值

获取特定键的值。

```http
GET /kv/token/:key
```

响应示例：
```json
{
  "data": "value1"
}
```

### 获取键的元数据

获取特定键的元数据信息。

```http
GET /kv/token/:key/metadata
```

响应示例：
```json
{
  "key": "key1",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "creatorIp": "127.0.0.1"
}
```

### 批量导入

批量导入多个键值对。

```http
POST /kv/token/_batchimport
```

请求体示例：
```json
{
  "key1": { "data": "value1" },
  "key2": { "data": "value2" }
}
```

响应示例：
```json
{
  "namespace": "device-uuid",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "key": "key1",
      "created": true
    },
    {
      "key": "key2",
      "created": true
    }
  ]
}
```

### 创建或更新键值

创建新的键值对或更新现有的键值对。

```http
POST /kv/token/:key
```

请求体示例：
```json
{
  "data": "value1"
}
```

响应示例：
```json
{
  "namespace": "device-uuid",
  "key": "key1",
  "created": true,
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 删除命名空间

删除整个命名空间及其所有键值对。

```http
DELETE /kv/token/
```

成功时返回 204 No Content。

### 删除键值对

删除特定的键值对。

```http
DELETE /kv/token/:key
```

成功时返回 204 No Content。

## 错误处理

所有错误响应都遵循以下格式：

```json
{
  "statusCode": 400,
  "message": "错误描述"
}
```

常见错误代码：
- 400: 请求参数错误
- 401: 未提供令牌或令牌无效
- 403: 权限不足
- 404: 资源不存在
- 429: 请求过于频繁
- 500: 服务器内部错误

## 权限

API 使用以下权限系统：
- `appReadAuthMiddleware`: 用于读取操作
- `appWriteAuthMiddleware`: 用于写入操作
- `appListAuthMiddleware`: 用于列表操作

这些权限基于应用程序的安装记录中的 `permissionPrefix` 和 `permissionKey` 字段进行验证。