# 设备授权流程 - CLI 工具

命令行工具，用于通过设备授权流程获取访问令牌。

## 使用方法

### 基本使用

```bash
node cli/get-token.js
```

### 配置环境变量

```bash
# 设置API服务器地址（默认: http://localhost:3030）
export API_BASE_URL=https://your-api-server.com

# 设置授权页面地址（默认: https://classworks.xiaomo.tech/authorize）
export AUTH_PAGE_URL=https://your-classworks-frontend.com/authorize

# 设置应用ID（默认: 1）
export APP_ID=1

# 设置站点密钥（如果需要）
export SITE_KEY=your-site-key

# 运行工具
node cli/get-token.js
```

### 使其可执行（Linux/Mac）

```bash
chmod +x cli/get-token.js
./cli/get-token.js
```

## 工作流程

1. **生成设备代码** - 工具会自动调用 API 生成形如 `1234-ABCD` 的授权码
2. **显示授权链接** - 在终端显示完整的授权URL，包含设备代码
3. **等待授权** - 用户点击链接或在授权页面手动输入设备代码完成授权
4. **获取令牌** - 工具自动轮询并获取令牌
5. **保存令牌** - 令牌会保存到 `~/.classworks/token.txt`

## 输出示例

```
设备授权流程 - 令牌获取工具

✓ 设备授权码生成成功！

============================================================
  请访问以下地址完成授权：

  https://classworks.xiaomo.tech/authorize?app_id=1&mode=devicecode&devicecode=1234-ABCD

  设备授权码: 1234-ABCD
============================================================
ℹ 授权码有效期: 15 分钟
ℹ API服务器: http://localhost:3030

ℹ 请在浏览器中打开上述地址，或在授权页面手动输入设备代码
ℹ 等待授权中...

等待授权... (1/100)
等待授权... (2/100)

==================================================
✓ 授权成功！令牌获取完成
==================================================

您的访问令牌：
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✓ 令牌已保存到: /home/user/.classworks/token.txt

使用示例：
  curl -H "Authorization: Bearer eyJhbGc..." http://localhost:3030/kv
```

## 配置选项

可以通过修改 `cli/get-token.js` 中的 `CONFIG` 对象或设置环境变量来调整：

- `baseUrl` / `API_BASE_URL` - API 服务器地址（默认: http://localhost:3030）
- `authPageUrl` / `AUTH_PAGE_URL` - Classworks 授权页面地址（默认: https://classworks.xiaomo.tech/authorize）
- `appId` / `APP_ID` - 应用ID（默认: 1）
- `siteKey` / `SITE_KEY` - 站点密钥（如果需要）
- `pollInterval` - 轮询间隔（秒，默认3秒）
- `maxPolls` - 最大轮询次数（默认100次）

## 错误处理

- 如果设备代码过期，会显示错误并退出
- 如果轮询超时（默认5分钟），会显示超时错误
- 如果无法连接到服务器，会显示连接错误
