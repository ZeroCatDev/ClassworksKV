# Token认证系统使用示例

本文档展示了如何使用重构后的基于Token的认证系统。

## 1. 基本Token认证

### 路由配置示例

```javascript
import express from 'express';
import { 
  tokenOnlyAuthMiddleware,
  tokenOnlyReadAuthMiddleware,
  tokenOnlyWriteAuthMiddleware 
} from './middleware/auth.js';

const router = express.Router();

// 需要完整认证的接口
router.use('/secure', tokenOnlyAuthMiddleware);
router.get('/secure/profile', (req, res) => {
  // res.locals.device, res.locals.appInstall, res.locals.app 已可用
  res.json({
    device: res.locals.device,
    app: res.locals.app
  });
});

// 只读接口
router.get('/data/:key', tokenOnlyReadAuthMiddleware, (req, res) => {
  // 处理读取逻辑
  res.json({ key: req.params.key, value: 'some-value' });
});

// 写入接口
router.post('/data/:key', tokenOnlyWriteAuthMiddleware, (req, res) => {
  // 处理写入逻辑
  res.json({ success: true, key: req.params.key });
});
```

## 2. 客户端请求示例

### 通过HTTP Header传递Token

```javascript
// 使用fetch
fetch('/api/secure/profile', {
  headers: {
    'x-app-token': 'your-app-token-here',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// 使用axios
axios.get('/api/secure/profile', {
  headers: {
    'x-app-token': 'your-app-token-here'
  }
});
```

### 通过查询参数传递Token

```javascript
// GET请求
fetch('/api/data/mykey?apptoken=your-app-token-here')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 通过请求体传递Token

```javascript
// POST请求
fetch('/api/data/mykey', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    apptoken: 'your-app-token-here',
    value: 'new-value'
  })
});
```

## 3. 错误处理

### 常见错误响应

```json
// 缺少Token
{
  "statusCode": 401,
  "message": "缺少应用访问令牌，请提供有效的token"
}

// 无效Token
{
  "statusCode": 401,
  "message": "无效的应用访问令牌"
}

// 权限不足
{
  "statusCode": 403,
  "message": "应用令牌无权访问此命名空间"
}
```

### 客户端错误处理示例

```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-app-token': 'your-app-token-here',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API错误 ${error.statusCode}: ${error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API请求失败:', error.message);
    throw error;
  }
}

// 使用示例
try {
  const data = await apiRequest('/api/secure/profile');
  console.log('用户数据:', data);
} catch (error) {
  // 处理认证错误
  if (error.message.includes('401')) {
    // 重新获取token或跳转到登录页
  }
}
```

## 4. 迁移指南

### 从UUID认证迁移到Token认证

```javascript
// 旧的UUID认证方式（已弃用）
router.get('/data/:namespace/:key', authMiddleware, (req, res) => {
  // 使用req.params.namespace作为设备标识
});

// 新的Token认证方式（推荐）
router.get('/data/:key', tokenOnlyReadAuthMiddleware, (req, res) => {
  // 设备信息通过token自动获取，存储在res.locals.device中
  const deviceUuid = res.locals.device.uuid;
});
```

### 客户端迁移

```javascript
// 旧方式：使用UUID和密码
fetch('/api/data/device-uuid-123/mykey', {
  headers: {
    'x-namespace-password': 'device-password'
  }
});

// 新方式：使用Token
fetch('/api/data/mykey', {
  headers: {
    'x-app-token': 'app-token-from-installation'
  }
});
```

## 5. 最佳实践

1. **优先使用Token认证**：新项目应该直接使用`tokenOnlyAuthMiddleware`等纯Token认证中间件

2. **安全存储Token**：在客户端安全存储应用Token，避免在URL中暴露

3. **错误处理**：实现完善的错误处理机制，特别是认证失败的情况

4. **Token刷新**：实现Token过期和刷新机制（如果需要）

5. **日志记录**：记录认证相关的操作日志，便于调试和安全审计

## 6. 权限前缀系统

Token认证系统支持基于前缀的权限控制：

```javascript
// 应用只能访问以特定前缀开头的键
// 例如：app.permissionPrefix = "myapp"
// 则只能访问 "myapp.config", "myapp.data" 等键

// 使用appReadAuthMiddleware自动进行前缀检查
router.get('/kv/:key', appReadAuthMiddleware, (req, res) => {
  // 自动检查req.params.key是否符合权限前缀
});
```

这个系统提供了更安全、更灵活的认证机制，建议所有新项目都采用Token认证方式。