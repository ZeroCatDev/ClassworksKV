# KV 服务管理应用

一个基于 Vue 3 + JavaScript + shadcn-vue 的 KV 存储服务管理界面，支持多应用 Token 管理和本地设备码生成。

## 功能特性

- 🔑 **多 Token 管理**：管理多个应用的访问 Token
- 🔐 **本地设备码生成**：自动生成设备授权码，无需服务器
- 📊 **KV 空间信息**：实时显示当前 KV 空间的使用情况
- 💾 **数据管理**：浏览、创建、编辑和删除 KV 键值对
- 🔍 **搜索过滤**：支持键名搜索和多种排序方式
- 📱 **响应式设计**：适配桌面和移动设备
- 🎨 **现代 UI**：shadcn-vue 组件库，简洁清爽
- ⚡ **快速开发**：Vite 驱动，HMR 即时更新
- 🗂️ **约定式路由**：基于文件系统的自动路由

## 技术栈

- **框架**：Vue 3 + JavaScript
- **构建工具**：Vite
- **UI 组件**：shadcn-vue
- **样式**：Tailwind CSS v4
- **路由**：Vue Router + unplugin-vue-router (约定式路由)
- **图标**：Lucide Icons
- **状态管理**：LocalStorage (轻量级)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SITE_KEY=your-site-key-here
```

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:5173 运行

### 4. 构建生产版本

```bash
pnpm build
```

构建产物将输出到 `dist` 目录。

## 项目结构

```
kv-admin/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn-vue 组件
│   ├── pages/               # 约定式路由页面
│   │   ├── index.vue        # Token 管理页面 (/)
│   │   └── dashboard.vue    # KV 数据管理 (/dashboard)
│   ├── lib/
│   │   ├── api.js           # API 客户端
│   │   ├── tokenStore.js    # Token 存储管理
│   │   └── utils.js         # 工具函数
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── style.css            # 全局样式
├── .env.example             # 环境变量模板
├── components.json          # shadcn-vue 配置
├── jsconfig.json            # JavaScript 配置
├── vite.config.js           # Vite 配置
└── package.json
```

## 核心功能说明

### 1. Token 管理（首页）

- **添加应用 Token**：输入应用名称和 Token，系统自动生成设备码
- **设备码生成**：本地随机生成格式如 `XXXX-XXXX-XXXX-XXXX` 的设备码
- **多 Token 支持**：可以添加多个应用的 Token，方便切换
- **活跃 Token**：选择当前要使用的 Token
- **KV 空间信息**：显示当前活跃应用的 KV 数据统计
- **Token 可见性**：支持显示/隐藏 Token 值
- **复制功能**：一键复制设备码和 Token

### 2. 数据管理（Dashboard）

- **浏览数据**：查看当前应用的所有 KV 键值对
- **搜索**：通过键名快速查找
- **排序**：按键名、创建时间或更新时间排序
- **创建**：添加新的键值对（JSON 格式）
- **编辑**：修改现有键值对的内容
- **查看详情**：查看完整的键值对信息和元数据
- **删除**：删除不需要的键值对
- **分页**：支持大量数据的分页浏览

### 设备码说明

**什么是设备码？**
- 设备码是应用授权的密钥，相当于一个唯一标识符
- 格式：`XXXX-XXXX-XXXX-XXXX`（4段，每段4个字母/数字）
- **本地生成**：无需服务器接口，在浏览器端随机生成
- **用途**：用于标识和授权特定的应用或设备访问 KV 服务

**工作流程：**
1. 用户添加应用 Token 时，系统自动生成设备码
2. 设备码与 Token 绑定存储在本地
3. 应用可以使用设备码作为标识符进行授权验证

## API 端点

应用与以下 API 端点交互：

### KV 存储
- `GET /kv` - 获取键值对列表
- `GET /kv/_keys` - 获取键名列表
- `GET /kv/:key` - 获取指定键的值
- `GET /kv/:key/metadata` - 获取键的元数据
- `POST /kv/:key` - 创建或更新键值对
- `DELETE /kv/:key` - 删除键值对
- `POST /kv/_batchimport` - 批量导入

## 数据存储

应用使用 LocalStorage 存储以下数据：

- `kv_tokens` - Token 列表数据
  ```json
  [
    {
      "id": "1234567890",
      "token": "your-token-here",
      "appName": "我的应用",
      "deviceCode": "ABCD-1234-EFGH-5678",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "lastUsed": "2025-01-01T00:00:00.000Z"
    }
  ]
  ```
- `kv_active_token` - 当前活跃的 Token ID

## 约定式路由

本项目使用 `unplugin-vue-router` 实现约定式路由，无需手动配置路由：

- `src/pages/index.vue` → `/` (Token 管理页面)
- `src/pages/dashboard.vue` → `/dashboard` (数据管理页面)

### 路由元信息

在页面组件中使用 `defineOptions` 设置路由元信息：

```vue
<script setup>
defineOptions({
  meta: {
    requiresAuth: true
  }
})
</script>
```

### 导航守卫

路由守卫在 `src/main.js` 中配置，自动处理授权检查：

```javascript
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.meta?.requiresAuth
  const activeToken = tokenStore.getActiveToken()

  if (requiresAuth && !activeToken) {
    next({ path: '/' })
  } else {
    next()
  }
})
```

## 开发

### 添加新页面

在 `src/pages/` 目录下创建新的 `.vue` 文件，路由会自动生成：

```
src/pages/
├── index.vue          → /
├── dashboard.vue      → /dashboard
└── settings.vue       → /settings (自动添加)
```

### 添加新组件

使用 shadcn-vue CLI 添加组件：

```bash
pnpm dlx shadcn-vue@latest add [component-name]
```

## 部署

### Vercel / Netlify

这些平台会自动检测 Vite 项目并进行构建。只需连接 Git 仓库即可。

### 传统服务器

构建后将 `dist` 目录部署到您的 Web 服务器，确保配置 SPA 回退规则：

**Nginx 示例**：
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 使用流程

### 首次使用

1. 访问首页
2. 点击"添加应用"
3. 输入应用名称（可选）和访问 Token
4. 系统自动生成设备码并保存
5. 点击"管理数据"进入数据管理页面

### 切换应用

1. 在首页的应用列表中
2. 点击要切换的应用行的"选择"按钮
3. 该应用变为"活跃"状态
4. KV 空间信息自动更新
5. 点击"管理数据"查看该应用的数据

### 管理数据

1. 在数据管理页面可以进行 CRUD 操作
2. 使用搜索框快速查找键名
3. 使用排序和分页功能浏览大量数据
4. 点击左上角的"主页"图标返回 Token 管理页面

## 安全建议

1. 始终使用 HTTPS 部署生产环境
2. 定期更换访问 Token
3. 不要在前端代码中硬编码敏感信息
4. 使用环境变量管理配置
5. 实施适当的 CORS 策略
6. LocalStorage 数据在浏览器端存储，注意隐私保护

## 技术亮点

- ✅ **纯 JavaScript**：无 TypeScript 依赖，更简单轻量
- ✅ **约定式路由**：基于文件系统，自动生成路由
- ✅ **本地设备码**：客户端生成，无需服务器接口
- ✅ **多 Token 管理**：支持多应用切换
- ✅ **现代化工具链**：Vite + Vue 3 组合式 API
- ✅ **完整的 UI 组件**：44 个 shadcn-vue 组件
- ✅ **响应式设计**：Tailwind CSS v4
- ✅ **轻量级状态**：LocalStorage 管理，无需额外状态库

## 许可证

MIT
