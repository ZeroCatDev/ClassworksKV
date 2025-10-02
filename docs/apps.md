# Apps API

## 1. 获取应用权限信息 (Get Application Permissions)

- **GET** `/apps/token/:token/permissions`

通过token获取应用权限信息。

**路径参数:**

- `token` (string, required): 应用访问令牌

**Curl 示例:**

```bash
curl -X GET "http://localhost:3000/api/apps/token/your-app-token/permissions" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "appId": 1,
  "permissionPrefix": "myapp",
  "specialPermissions": [],
  "permissionKey": [],
  "app": {
    "id": 1,
    "name": "应用名称",
    "description": "应用描述",
    "developerName": "开发者"
  }
}
```

## 2. 获取应用列表 (Get App List)

- **GET** `/apps`

获取应用列表，支持搜索和分页。

**查询参数:**

- `limit` (integer, optional, default: 20): 每页数量
- `skip` (integer, optional, default: 0): 跳过数量
- `search` (string, optional): 搜索关键词

**Curl 示例:**

```bash
curl -X GET "http://localhost:3000/api/apps?limit=10&skip=0&search=test" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "apps": [
    {
      "id": 1,
      "name": "Test App",
      "description": "An application for testing.",
      "developerName": "Test Developer",
      "permissionPrefix": "testapp",
      "specialPermissions": [],
      "permissionKey": [],
      "version": "1.0.0",
      "createdAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

## 3. 获取单个应用详情 (Get App Details)

- **GET** `/apps/:id`

获取单个应用详情。

**路径参数:**

- `id` (integer, required): 应用ID

**Curl 示例:**

```bash
curl -X GET "http://localhost:3000/api/apps/1" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "id": 1,
  "name": "Test App",
  "description": "An application for testing.",
  "developerName": "Test Developer",
  "permissionPrefix": "testapp",
  "specialPermissions": [],
  "permissionKey": [],
  "version": "1.0.0",
  "createdAt": "2023-10-27T10:00:00.000Z",
  "updatedAt": "2023-10-27T10:00:00.000Z"
}
```

## 4. 为设备授权或升级应用 (Install or Upgrade App for Device)

- **POST** `/apps/:id/install/:deviceUuid`

为设备授权应用。如果应用已安装，则会将其升级到最新版本。

**路径参数:**

- `id` (integer, required): 应用ID
- `deviceUuid` (string, required): 设备UUID

**Curl 示例:**

```bash
curl -X POST "http://localhost:3000/api/apps/1/install/your-device-uuid" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "token": "a-unique-token-for-this-installation",
  "appId": 1,
  "permissionPrefix": "testapp",
  "permissionKey": [],
  "version": "1.1.0",
  "authorizedAt": "2023-10-27T11:00:00.000Z"
}
```

## 6. 卸载设备上的应用 (Uninstall App from Device)

- **DELETE** `/apps/:id/uninstall/:deviceUuid`

卸载设备上已安装的应用。

**路径参数:**

- `id` (integer, required): 应用ID
- `deviceUuid` (string, required): 设备UUID

**Curl 示例:**

```bash
curl -X DELETE "http://localhost:3000/api/apps/1/uninstall/your-device-uuid" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "message": "应用卸载成功",
  "appId": 1,
  "uninstalledAt": "2023-10-27T12:00:00.000Z"
}
```

## 7. 获取设备已安装的应用列表 (Get Installed Apps on Device)

- **GET** `/devices/:deviceUuid/apps`

获取指定设备上已安装的所有应用列表。

**路径参数:**

- `deviceUuid` (string, required): 设备UUID

**查询参数:**

- `limit` (integer, optional, default: 20): 每页数量
- `skip` (integer, optional, default: 0): 跳过数量

**Curl 示例:**

```bash
curl -X GET "http://localhost:3000/api/devices/your-device-uuid/apps?limit=10" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "installs": [
    {
      "id": 1,
      "appId": 1,
      "token": "a-unique-token-for-this-installation",
      "permissionPrefix": "testapp",
      "specialPermissions": [],
      "permissionKey": [],
      "version": "1.0.0",
      "installedAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:00.000Z",
      "app": {
        "id": 1,
        "name": "Test App",
        "description": "An application for testing.",
        "developerName": "Test Developer",
        "permissionPrefix": "testapp"
      }
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

## 8. 获取所有带有 permissionKey 的应用列表 (Get Apps with Permission Key)

- **GET** `/apps/with-permission-key`

获取所有设置了 `permissionKey` 的应用列表。

**Curl 示例:**

```bash
curl -X GET "http://localhost:3000/api/apps/with-permission-key" \
     -H "X-Site-Key: your-site-key"
```

**响应示例 (200 OK):**

```json
{
  "apps": [
    {
      "id": 2,
      "name": "App With Keys",
      "description": "An application that uses permission keys.",
      "developerName": "Key Developer",
      "permissionPrefix": "keyapp",
      "specialPermissions": [],
      "permissionKey": ["read:data", "write:data"],
      "version": "1.0.0",
      "createdAt": "2023-10-26T10:00:00.000Z",
      "updatedAt": "2023-10-26T10:00:00.000Z"
    }
  ]
}
```