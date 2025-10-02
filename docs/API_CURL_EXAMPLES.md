# API 使用示例 - cURL

本文档提供所有API接口的完整cURL示例。

## 环境变量设置

```bash
# 设置基础URL和站点密钥
export BASE_URL="http://localhost:3030"
export SITE_KEY="your-site-key-here"
```

## 1. 应用管理 API

### 1.1 获取应用列表

```bash
# 基本查询
curl -X GET "http://localhost:3030/apps" \
  -H "x-site-key: ${SITE_KEY}"

# 带分页和搜索
curl -X GET "http://localhost:3030/apps?limit=10&skip=0&search=my-app" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "apps": [
    {
      "id": 1,
      "name": "我的应用",
      "description": "应用描述",
      "developerName": "开发者名称",
      "developerLink": "https://developer.com",
      "homepageLink": "https://app.com",
      "iconHash": "abc123",
      "metadata": {},
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

### 1.2 获取单个应用详情

```bash
curl -X GET "http://localhost:3030/apps/1" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "id": 1,
  "name": "我的应用",
  "description": "应用描述",
  "developerName": "开发者名称",
  "developerLink": "https://developer.com",
  "homepageLink": "https://app.com",
  "iconHash": "abc123",
  "metadata": {},
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### 1.4 获取应用的所有安装记录

```bash
curl -X GET "http://localhost:3030/apps/1/installations?limit=10&skip=0" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "appId": 1,
  "installations": [
    {
      "id": "clx1234567890",
      "token": "a1b2c3d4e5f6...",
      "device": {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "name": "我的设备"
      },
      "note": "完整访问",
      "installedAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

## 2. Token 管理 API

### 2.1 获取设备的所有Token

```bash
curl -X GET "http://localhost:3030/apps/devices/550e8400-e29b-41d4-a716-446655440000/tokens" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "我的设备",
  "tokens": [
    {
      "id": "clx1234567890",
      "token": "a1b2c3d4e5f6...",
      "app": {
        "id": 1,
        "name": "我的应用",
        "description": "应用描述",
        "developerName": "开发者",
        "iconHash": "abc123"
      },
      "note": "完整访问",
      "installedAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 2.2 撤销Token

```bash
curl -X DELETE "http://localhost:3030/apps/tokens/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "x-site-key: ${SITE_KEY}"
```

**成功响应:** HTTP 204 No Content

**错误响应:**
```json
{
  "statusCode": 404,
  "message": "Token不存在"
}
```

## 3. KV 操作 API（需要Token）

**设置Token环境变量:**
```bash
export TOKEN="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

### 3.1 获取所有键（含元数据）

```bash
# 基本查询
curl -X GET "http://localhost:3030/kv" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 带分页和排序
curl -X GET "http://localhost:3030/kv?sortBy=key&sortDir=asc&limit=50&skip=0" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 按更新时间排序
curl -X GET "http://localhost:3030/kv?sortBy=updatedAt&sortDir=desc&limit=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "items": [
    {
      "deviceId": 1,
      "key": "user.profile",
      "metadata": {
        "creatorIp": "192.168.1.1",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    }
  ],
  "total_rows": 1,
  "load_more": "/kv?sortBy=key&sortDir=asc&limit=50&skip=50"
}
```

### 3.2 获取键名列表（仅键名）

```bash
curl -X GET "http://localhost:3030/kv/_keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 带分页
curl -X GET "http://localhost:3030/kv/_keys?limit=100&skip=0" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "keys": [
    "user.profile",
    "user.settings",
    "app.config"
  ],
  "total_rows": 3,
  "current_page": {
    "limit": 100,
    "skip": 0,
    "count": 3
  }
}
```

### 3.3 获取键值

```bash
# 使用 Authorization header（推荐）
curl -X GET "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 使用 query 参数
curl -X GET "http://localhost:3030/kv/user.profile?token=${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "zh-CN"
  }
}
```

**错误响应（键不存在）:**
```json
{
  "statusCode": 404,
  "message": "未找到键名为 'user.profile' 的记录"
}
```

### 3.4 获取键的元数据

```bash
curl -X GET "http://localhost:3030/kv/user.profile/metadata" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应示例:**
```json
{
  "deviceId": 1,
  "key": "user.profile",
  "metadata": {
    "creatorIp": "192.168.1.1",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T12:30:00.000Z"
  }
}
```

### 3.5 创建/更新键值

```bash
# 创建新键
curl -X POST "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://example.com/avatar.jpg"
  }'

# 更新已存在的键
curl -X POST "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "name": "张三",
    "email": "newemail@example.com",
    "avatar": "https://example.com/new-avatar.jpg",
    "updatedBy": "admin"
  }'

# 存储数组
curl -X POST "http://localhost:3030/kv/user.tags" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '["developer", "admin", "vip"]'

# 存储嵌套对象
curl -X POST "http://localhost:3030/kv/app.config" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "database": {
      "host": "localhost",
      "port": 3306,
      "name": "mydb"
    },
    "cache": {
      "enabled": true,
      "ttl": 3600
    }
  }'
```

**响应示例（创建）:**
```json
{
  "deviceId": 1,
  "key": "user.profile",
  "created": true,
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**响应示例（更新）:**
```json
{
  "deviceId": 1,
  "key": "user.profile",
  "created": false,
  "updatedAt": "2025-01-01T12:30:00.000Z"
}
```

### 3.6 批量导入键值对

```bash
curl -X POST "http://localhost:3030/kv/_batchimport" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "user.profile": {
      "name": "张三",
      "email": "zhangsan@example.com"
    },
    "user.settings": {
      "theme": "dark",
      "language": "zh-CN"
    },
    "app.config": {
      "version": "1.0.0",
      "debug": false
    }
  }'
```

**响应示例:**
```json
{
  "deviceId": 1,
  "total": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "key": "user.profile",
      "created": true
    },
    {
      "key": "user.settings",
      "created": true
    },
    {
      "key": "app.config",
      "created": false
    }
  ]
}
```

**部分失败响应:**
```json
{
  "deviceId": 1,
  "total": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "key": "user.profile",
      "created": true
    },
    {
      "key": "user.settings",
      "created": true
    }
  ],
  "errors": [
    {
      "key": "invalid.key",
      "error": "验证失败"
    }
  ]
}
```

### 3.7 删除键值对

```bash
curl -X DELETE "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"
```

**成功响应:** HTTP 204 No Content

**错误响应（键不存在）:**
```json
{
  "statusCode": 404,
  "message": "未找到键名为 'user.profile' 的记录"
}
```

## 4. 完整工作流示例

### 场景：应用首次访问设备的KV存储

```bash
#!/bin/bash

# 1. 设置环境变量
export BASE_URL="http://localhost:3030"
export SITE_KEY="your-site-key"
export APP_ID="1"
export DEVICE_UUID="550e8400-e29b-41d4-a716-446655440000"
export DEVICE_PASSWORD="my-password"

# 2. 为应用授权获取token
echo "正在授权应用..."
RESPONSE=$(curl -s -X POST "http://localhost:3030/apps/${APP_ID}/authorize" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d "{
    \"deviceUuid\": \"${DEVICE_UUID}\",
    \"password\": \"${DEVICE_PASSWORD}\",
    \"readOnly\": false,
    \"note\": \"自动授权\"
  }")

# 3. 提取token
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "获取到Token: ${TOKEN:0:20}..."

# 4. 写入数据
echo "写入用户配置..."
curl -X POST "http://localhost:3030/kv/user.config" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "theme": "dark",
    "notifications": true,
    "language": "zh-CN"
  }'

# 5. 读取数据
echo "读取用户配置..."
curl -X GET "http://localhost:3030/kv/user.config" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 6. 获取所有键名
echo "获取所有键名..."
curl -X GET "http://localhost:3030/kv/_keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}"

# 7. 批量导入数据
echo "批量导入数据..."
curl -X POST "http://localhost:3030/kv/_batchimport" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "user.profile": {"name": "张三", "age": 25},
    "user.preferences": {"color": "blue"},
    "app.version": {"current": "1.0.0"}
  }'

echo "完成！"
```

## 5. 错误处理示例

### 5.1 Token认证失败

```bash
# 使用无效token
curl -X GET "http://localhost:3030/kv/mykey" \
  -H "Authorization: Bearer invalid-token" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应:**
```json
{
  "statusCode": 401,
  "message": "无效的身份验证令牌"
}
```

### 5.2 缺少Token

```bash
curl -X GET "http://localhost:3030/kv/mykey" \
  -H "x-site-key: ${SITE_KEY}"
```

**响应:**
```json
{
  "statusCode": 401,
  "message": "未提供身份验证令牌"
}
```

### 5.3 站点密钥错误

```bash
curl -X GET "http://localhost:3030/apps" \
  -H "x-site-key: wrong-key"
```

**响应:**
```json
{
  "statusCode": 401,
  "message": "无效的站点密钥"
}
```

### 5.4 设备不存在

```bash
curl -X POST "http://localhost:3030/apps/1/authorize" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{
    "deviceUuid": "non-existent-uuid"
  }'
```

**响应:**
```json
{
  "statusCode": 404,
  "message": "设备不存在"
}
```

## 6. 高级用例

### 6.1 使用jq处理响应

```bash
# 提取所有键名
curl -s -X GET "http://localhost:3030/kv/_keys" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}" \
  | jq -r '.keys[]'

# 获取token并保存
TOKEN=$(curl -s -X POST "http://localhost:3030/apps/1/authorize" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d '{"deviceUuid":"550e8400-e29b-41d4-a716-446655440000"}' \
  | jq -r '.token')

# 格式化输出
curl -s -X GET "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}" \
  | jq '.'
```

### 6.2 循环批量操作

```bash
# 批量创建键值对
for i in {1..10}; do
  curl -X POST "http://localhost:3030/kv/item.${i}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "x-site-key: ${SITE_KEY}" \
    -d "{\"id\": ${i}, \"name\": \"Item ${i}\"}"
  echo "Created item.${i}"
done

# 批量读取
for key in user.profile user.settings app.config; do
  echo "Reading ${key}:"
  curl -s -X GET "http://localhost:3030/kv/${key}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "x-site-key: ${SITE_KEY}" \
    | jq '.'
done
```

### 6.3 条件更新模式

```bash
# 读取当前值
CURRENT=$(curl -s -X GET "http://localhost:3030/kv/counter" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}")

# 修改值
NEW_VALUE=$(echo $CURRENT | jq '.count += 1')

# 写回
curl -X POST "http://localhost:3030/kv/counter" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-site-key: ${SITE_KEY}" \
  -d "${NEW_VALUE}"
```

## 7. 性能测试

### 7.1 并发请求测试

```bash
# 使用 xargs 进行并发测试
seq 1 10 | xargs -P 10 -I {} curl -s -X GET "http://localhost:3030/kv/test.key" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}" \
  -o /dev/null -w "Request {}: %{http_code} in %{time_total}s\n"
```

### 7.2 响应时间测试

```bash
# 测量单个请求时间
curl -X GET "http://localhost:3030/kv/user.profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-site-key: ${SITE_KEY}" \
  -w "\nTotal time: %{time_total}s\n" \
  -o /dev/null -s
```