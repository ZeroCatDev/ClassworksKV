# 设备授权流程 - 前端接口文档

## 概述

类似 Device Authorization Grant 的授权流程，允许应用通过设备代码获取用户的访问令牌。

## 前端相关接口

### 1. 绑定令牌到设备代码

将用户的访问令牌绑定到应用提供的设备代码。

**接口地址：** `POST /auth/device/bind`

**请求头：**
```
Content-Type: application/json
X-Site-Key: your-site-key
```

**请求体：**
```json
{
  "device_code": "1234-ABCD",
  "token": "user-access-token-string"
}
```

**参数说明：**
- `device_code` (必填): 应用提供给用户的设备授权码，格式如 `1234-ABCD`
- `token` (必填): 用户在系统中已有的有效访问令牌

**成功响应：** `200 OK`
```json
{
  "success": true,
  "message": "令牌已成功绑定到设备代码"
}
```

**错误响应：**

400 Bad Request - 参数错误
```json
{
  "statusCode": 400,
  "message": "请提供 device_code 和 token"
}
```

400 Bad Request - 无效的令牌
```json
{
  "statusCode": 400,
  "message": "无效的令牌"
}
```

400 Bad Request - 设备代码不存在或已过期
```json
{
  "statusCode": 400,
  "message": "设备代码不存在或已过期"
}
```

---

### 2. 查询设备代码状态（可选，用于调试）

查询设备代码的当前状态，不会删除或修改数据。

**接口地址：** `GET /auth/device/status`

**请求头：**
```
X-Site-Key: your-site-key
```

**查询参数：**
- `device_code` (必填): 设备授权码

**请求示例：**
```
GET /auth/device/status?device_code=1234-ABCD
```

**成功响应：** `200 OK`

设备代码存在：
```json
{
  "device_code": "1234-ABCD",
  "exists": true,
  "has_token": false,
  "expires_in": 850,
  "created_at": 1234567890000
}
```

设备代码不存在或已过期：
```json
{
  "device_code": "1234-ABCD",
  "exists": false,
  "message": "设备代码不存在或已过期"
}
```

**字段说明：**
- `exists`: 设备代码是否存在且有效
- `has_token`: 是否已绑定令牌
- `expires_in`: 剩余有效时间（秒）
- `created_at`: 创建时间戳（毫秒）

---

## 使用流程

1. **应用端**生成设备代码并展示给用户
2. **用户**在前端页面输入设备代码
3. **前端**调用 `/auth/device/bind` 接口，将用户的 token 绑定到设备代码
4. **应用端**轮询获取到令牌，完成授权

## 注意事项

- 设备代码有效期为 15 分钟
- 令牌必须是系统中已存在的有效令牌
- 设备代码格式固定为 `XXXX-XXXX` (4位数字-4位字母/数字)
- 令牌获取后会从服务器内存中删除，只能获取一次
- 如果需要站点密钥，需在请求头中添加 `X-Site-Key`
