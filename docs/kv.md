# KV Store API

## 1. 获取设备信息 (Get Device Info)

- **GET** `/:namespace/_info`

获取指定命名空间（设备）的详细信息。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <token>`

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/_info" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-read-token"
```

**响应示例 (200 OK):**

```json
{
  "uuid": "your-device-uuid",
  "name": "My Device",
  "accessType": "PROTECTED",
  "hasPassword": true
}
```

## 2. 检查设备状态 (Check Device Status)

- **GET** `/:namespace/_check`

检查设备是否存在及基本信息。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/_check" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "status": "success",
  "uuid": "your-device-uuid",
  "name": "My Device",
  "accessType": "PROTECTED",
  "hasPassword": true
}
```

## 3. 校验设备密码 (Check Device Password)

- **POST** `/:namespace/_checkpassword`

校验设备密码是否正确。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥

**请求体:**

```json
{
  "password": "your-device-password"
}
```

**Curl 示例:**

```bash
curl -X POST "http://localhost:3030/kv/your-device-uuid/_checkpassword" \
     -H "X-Site-Key: your-site-key" \
     -H "Content-Type: application/json" \
     -d '{"password": "your-device-password"}'
```

**响应示例 (200 OK):**

```json
{
  "status": "success",
  "uuid": "your-device-uuid",
  "name": "My Device",
  "accessType": "PROTECTED",
  "hasPassword": true
}
```

## 4. 获取密码提示 (Get Password Hint)

- **GET** `/:namespace/_hint`

获取设备的密码提示。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/_hint" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "passwordHint": "My favorite pet's name"
}
```

## 5. 更新密码提示 (Update Password Hint)

- **PUT** `/:namespace/_hint`

更新设备的密码提示。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**请求体:**

```json
{
  "hint": "New password hint"
}
```

**Curl 示例:**

```bash
curl -X PUT "http://localhost:3030/kv/your-device-uuid/_hint" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token" \
     -H "Content-Type: application/json" \
     -d '{"hint": "New password hint"}'
```

**响应示例 (200 OK):**

```json
{
  "message": "密码提示已更新",
  "passwordHint": "New password hint"
}
```

## 6. 更新设备信息 (Update Device Info)

- **PUT** `/:namespace/_info`

更新设备名称或访问类型。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**请求体:**

```json
{
  "name": "New Device Name",
  "accessType": "PRIVATE"
}
```

**Curl 示例:**

```bash
curl -X PUT "http://localhost:3030/kv/your-device-uuid/_info" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token" \
     -H "Content-Type: application/json" \
     -d '{"name": "New Device Name", "accessType": "PRIVATE"}'
```

**响应示例 (200 OK):**

```json
{
  "uuid": "your-device-uuid",
  "name": "New Device Name",
  "accessType": "PRIVATE",
  "hasPassword": true
}
```

## 7. 移除设备密码 (Remove Device Password)

- **DELETE** `/:namespace/_password`

移除设备的密码。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**请求体:**

```json
{
  "password": "current-password"
}
```

**Curl 示例:**

```bash
curl -X DELETE "http://localhost:3030/kv/your-device-uuid/_password" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token" \
     -H "Content-Type: application/json" \
     -d '{"password": "current-password"}'
```

**响应示例 (200 OK):**

```json
{
  "message": "密码已成功移除"
}
```

## 8. 获取键名列表 (List Keys)

- **GET** `/:namespace/_keys`

获取指定命名空间下的键名列表（不包含值）。

**路径参数:**

- `namespace` (string, required): 设备UUID

**查询参数:**

- `sortBy` (string, optional, default: `key`): 排序字段
- `sortDir` (string, optional, default: `asc`): 排序方向
- `limit` (integer, optional, default: 100): 每页数量
- `skip` (integer, optional, default: 0): 跳过数量

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <read-token>`

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/_keys?limit=50&sortDir=desc" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-read-token"
```

**响应示例 (200 OK):**

```json
{
  "keys": [
    "key3",
    "key2",
    "key1"
  ],
  "total_rows": 3,
  "current_page": {
    "limit": 50,
    "skip": 0,
    "count": 3
  }
}
```

## 9. 获取所有键值对 (List All Key-Value Pairs)

- **GET** `/:namespace`

获取指定命名空间下的所有键值对及元数据。

**路径参数:**

- `namespace` (string, required): 设备UUID

**查询参数:**

- `sortBy` (string, optional, default: `key`): 排序字段
- `sortDir` (string, optional, default: `asc`): 排序方向
- `limit` (integer, optional, default: 100): 每页数量
- `skip` (integer, optional, default: 0): 跳过数量

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <read-token>`

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid?limit=1" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-read-token"
```

**响应示例 (200 OK):**

```json
{
  "items": [
    {
      "key": "key1",
      "value": {"data": "some value"},
      "createdAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:00.000Z",
      "creatorIp": "::1"
    }
  ],
  "total_rows": 1,
  "load_more": "/api/kv/your-device-uuid?sortBy=key&sortDir=asc&limit=1&skip=1"
}
```

## 10. 获取单个键值 (Get Value by Key)

- **GET** `/:namespace/:key`

通过键名获取单个键值。

**路径参数:**

- `namespace` (string, required): 设备UUID
- `key` (string, required): 键名

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <read-token>`

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/my-key" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-read-token"
```

**响应示例 (200 OK):**

```json
{
  "some_data": "value",
  "nested": {
    "is_supported": true
  }
}
```

## 11. 获取键的元数据 (Get Key Metadata)

- **GET** `/:namespace/:key/metadata`

获取单个键的元数据。

**路径参数:**

- `namespace` (string, required): 设备UUID
- `key` (string, required): 键名

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <read-token>`

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/your-device-uuid/my-key/metadata" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-read-token"
```

**响应示例 (200 OK):**

```json
{
    "key": "my-key",
    "createdAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:00:00.000Z",
    "creatorIp": "::1"
}
```

## 12. 批量导入键值对 (Batch Import Key-Value Pairs)

- **POST** `/:namespace/_batchimport`

批量导入多个键值对。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**请求体:**

```json
{
  "key1": {"data": "value1"},
  "key2": {"data": "value2"}
}
```

**Curl 示例:**

```bash
curl -X POST "http://localhost:3030/kv/your-device-uuid/_batchimport" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token" \
     -H "Content-Type: application/json" \
     -d '{"key1": {"data": "value1"}, "key2": {"data": "value2"}}'
```

**响应示例 (200 OK):**

```json
{
  "namespace": "your-device-uuid",
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

## 13. 创建或更新键值对 (Create/Update Key-Value Pair)

- **POST** `/:namespace/:key`

创建或更新单个键值对。

**路径参数:**

- `namespace` (string, required): 设备UUID
- `key` (string, required): 键名

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**请求体:**

```json
{
  "new_data": "is here"
}
```

**Curl 示例:**

```bash
curl -X POST "http://localhost:3030/kv/your-device-uuid/my-key" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token" \
     -H "Content-Type: application/json" \
     -d '{"new_data": "is here"}'
```

**响应示例 (200 OK):**

```json
{
  "namespace": "your-device-uuid",
  "key": "my-key",
  "created": false,
  "updatedAt": "2023-10-27T11:00:00.000Z"
}
```

## 14. 删除命名空间 (Delete Namespace)

- **DELETE** `/:namespace`

删除整个命名空间及其所有数据。

**路径参数:**

- `namespace` (string, required): 设备UUID

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**Curl 示例:**

```bash
curl -X DELETE "http://localhost:3030/kv/your-device-uuid" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token"
```

**响应 (204 No Content):**

无响应体。

## 15. 删除键 (Delete Key)

- **DELETE** `/:namespace/:key`

删除单个键值对。

**路径参数:**

- `namespace` (string, required): 设备UUID
- `key` (string, required): 键名

**Headers:**

- `X-Site-Key` (string, required): 站点密钥
- `Authorization` (string, required): `Bearer <write-token>`

**Curl 示例:**

```bash
curl -X DELETE "http://localhost:3030/kv/your-device-uuid/my-key" \
     -H "X-Site-Key: your-site-key" \
     -H "Authorization: Bearer your-write-token"
```

**响应 (204 No Content):**

无响应体。

## 16. 生成 UUID (Generate UUID)

- **GET** `/uuid`

生成一个新的 UUID，可用作命名空间。

**Headers:**

- `X-Site-Key` (string, required): 站点密钥

**Curl 示例:**

```bash
curl -X GET "http://localhost:3030/kv/uuid" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "namespace": "a-newly-generated-uuid"
}
```