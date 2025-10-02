# 中间件系统文档

## 概述

本项目使用中间件系统来处理设备信息获取、权限验证和Token认证。所有与UUID相关的操作都通过统一的中间件处理。

## 中间件架构

### 1. 设备信息中间件 (`deviceMiddleware`)

**文件位置**: `middleware/device.js`

**功能**: 统一处理设备UUID，自动获取或创建设备

**使用场景**:
- 所有需要设备信息的接口
- 不需要密码验证的读操作
- 需要在后续中间件中访问设备信息的场景

**工作流程**:
1. 从 `req.params.deviceUuid`、`req.params.namespace` 或 `req.body.deviceUuid` 获取UUID
2. 在数据库中查找设备
3. 如果设备不存在，自动创建新设备
4. 将设备信息存储到 `res.locals.device`

**代码示例**:
```javascript
import { deviceMiddleware } from './middleware/device.js';

// 基本用法
router.get('/device/:deviceUuid/info', deviceMiddleware, (req, res) => {
  // 设备信息可从 res.locals.device 访问
  res.json(res.locals.device);
});

// 从body获取UUID
router.post('/device/create', deviceMiddleware, (req, res) => {
  // req.body.deviceUuid 会被自动处理
  res.json({ message: '设备已创建', device: res.locals.device });
});
```

**数据访问**:
```javascript
const device = res.locals.device;
// device: {
//   id: 1,
//   uuid: 'device-uuid-123',
//   name: 'My Device',
//   password: 'hashed-password',
//   passwordHint: '提示信息',
//   accountId: null,
//   createdAt: Date,
//   updatedAt: Date
// }
```

---

### 2. 写权限验证中间件 (`requireWriteAuth`)

**文件位置**: `middleware/tokenAuth.js`

**功能**: 验证设备密码，控制写权限

**依赖**: 必须在 `deviceMiddleware` 之后使用

**使用场景**:
- 所有需要修改数据的操作（POST、PUT、DELETE）
- 需要验证设备密码的操作

**工作流程**:
1. 从 `res.locals.device` 获取设备信息
2. 如果设备没有设置密码，直接允许操作
3. 如果设备设置了密码：
   - 从 `req.body.password` 或 `req.query.password` 获取密码
   - 验证密码是否正确
   - 密码正确：继续执行
   - 密码错误或未提供：返回 401 错误

**代码示例**:
```javascript
import { deviceMiddleware } from './middleware/device.js';
import { requireWriteAuth } from './middleware/tokenAuth.js';

// 写操作需要密码验证
router.post('/device/:deviceUuid/data',
  deviceMiddleware,        // 第一步：获取设备信息
  requireWriteAuth,        // 第二步：验证写权限
  (req, res) => {
    // 验证通过，执行写操作
    res.json({ message: '数据已更新' });
  }
);

// 读操作不需要密码
router.get('/device/:deviceUuid/data',
  deviceMiddleware,        // 只需要设备信息
  (req, res) => {
    res.json({ data: 'some data' });
  }
);
```

**密码提供方式**:
```javascript
// 方式1: 通过请求体
fetch('/device/uuid-123/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'device-password',
    data: 'new value'
  })
});

// 方式2: 通过查询参数
fetch('/device/uuid-123/data?password=device-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'new value' })
});
```

**错误响应**:
```json
// 需要密码但未提供
{
  "statusCode": 401,
  "message": "此操作需要密码",
  "passwordHint": "提示信息"
}

// 密码错误
{
  "statusCode": 401,
  "message": "密码错误"
}
```

---

### 3. Token认证中间件 (`tokenAuth`)

**文件位置**: `middleware/tokenAuth.js`

**功能**: 基于应用安装Token进行认证

**使用场景**:
- 应用访问KV数据
- 需要应用级别认证的接口
- 不依赖设备UUID的操作

**工作流程**:
1. 从 Header、Query 或 Body 中获取 token
2. 在数据库中查找对应的应用安装记录
3. 验证 token 是否有效
4. 将应用、设备信息存储到 `res.locals`

**Token提供方式**:
1. **Authorization Header** (推荐):
   ```javascript
   headers: {
     'Authorization': 'Bearer <token>'
   }
   ```

2. **Query参数**:
   ```javascript
   ?token=<token>
   ```

3. **Request Body**:
   ```javascript
   {
     "token": "<token>",
     "data": "..."
   }
   ```

**代码示例**:
```javascript
import { tokenAuth } from './middleware/tokenAuth.js';

// Token认证的接口
router.get('/kv/:key', tokenAuth, (req, res) => {
  // 可访问:
  // - res.locals.appInstall (应用安装记录)
  // - res.locals.app (应用信息)
  // - res.locals.device (设备信息)
  // - res.locals.deviceId (设备ID)

  res.json({
    key: req.params.key,
    device: res.locals.device.uuid,
    app: res.locals.app.name
  });
});
```

**数据访问**:
```javascript
const appInstall = res.locals.appInstall;
// appInstall: {
//   id: 'cuid',
//   deviceId: 1,
//   appId: 1,
//   token: 'unique-token',
//   note: '备注',
//   installedAt: Date,
//   updatedAt: Date,
//   app: { ... },
//   device: { ... }
// }

const app = res.locals.app;
// app: { id, name, description, developerName, ... }

const device = res.locals.device;
// device: { id, uuid, name, password, ... }
```

---

## 中间件组合使用

### 场景1: 基于UUID的读操作（无需密码）
```javascript
router.get('/device/:deviceUuid/data',
  deviceMiddleware,
  (req, res) => {
    const device = res.locals.device;
    res.json({ device, data: '...' });
  }
);
```

### 场景2: 基于UUID的写操作（需要密码）
```javascript
router.post('/device/:deviceUuid/data',
  deviceMiddleware,      // 获取设备信息
  requireWriteAuth,      // 验证密码
  (req, res) => {
    // 执行写操作
    res.json({ message: '成功' });
  }
);
```

### 场景3: 基于Token的操作
```javascript
router.get('/kv/:key',
  tokenAuth,             // Token认证，自动获取设备信息
  (req, res) => {
    const device = res.locals.device;
    const app = res.locals.app;
    res.json({ device, app, data: '...' });
  }
);
```

### 场景4: 批量路由保护
```javascript
const router = express.Router();

// 所有该路由下的接口都需要设备信息
router.use(deviceMiddleware);

// 具体接口
router.get('/info', (req, res) => {
  res.json(res.locals.device);
});

router.post('/update', requireWriteAuth, (req, res) => {
  res.json({ message: '更新成功' });
});
```

---

## 最佳实践

### 1. 中间件顺序很重要
```javascript
// ✅ 正确：先获取设备信息，再验证权限
router.post('/data', deviceMiddleware, requireWriteAuth, handler);

// ❌ 错误：requireWriteAuth 依赖 deviceMiddleware
router.post('/data', requireWriteAuth, deviceMiddleware, handler);
```

### 2. 选择合适的认证方式
```javascript
// 用户直接操作设备 → 使用 deviceMiddleware + requireWriteAuth
router.post('/device/:deviceUuid/config', deviceMiddleware, requireWriteAuth, handler);

// 应用代表用户操作 → 使用 tokenAuth
router.post('/kv/:key', tokenAuth, handler);
```

### 3. 读操作不需要密码
```javascript
// ✅ 读操作只需要设备信息
router.get('/device/:deviceUuid/data', deviceMiddleware, handler);

// ❌ 读操作不需要密码验证
router.get('/device/:deviceUuid/data', deviceMiddleware, requireWriteAuth, handler);
```

### 4. 错误处理
```javascript
router.post('/data', deviceMiddleware, requireWriteAuth,
  async (req, res, next) => {
    try {
      // 业务逻辑
      const device = res.locals.device;
      // ...
      res.json({ success: true });
    } catch (error) {
      next(error); // 传递给全局错误处理器
    }
  }
);
```

### 5. 密码提示信息
```javascript
// 设置设备时提供密码提示
await prisma.device.update({
  where: { uuid: deviceUuid },
  data: {
    password: hashedPassword,
    passwordHint: '您的生日（8位数字）' // 提供友好的提示
  }
});
```

---

## 常见问题

### Q1: 为什么设备不存在时会自动创建？
**A**: 这是为了简化客户端逻辑。客户端只需要生成UUID并使用，无需先调用创建接口。首次访问时会自动创建设备记录。

### Q2: 读操作为什么不需要密码？
**A**: 根据项目需求，只有写操作需要密码保护。读操作允许任何知道UUID的人访问。如果需要保护读操作，可以在路由中添加 `requireWriteAuth` 中间件。

### Q3: deviceMiddleware 和 tokenAuth 有什么区别？
**A**:
- `deviceMiddleware`: 基于UUID获取设备信息，适合用户直接操作
- `tokenAuth`: 基于应用Token认证，适合应用代表用户操作，包含应用级别的权限控制

### Q4: 如何撤销某个设备的访问权限？
**A**:
1. 基于UUID的访问：修改设备密码
2. 基于Token的访问：删除对应的 `AppInstall` 记录

### Q5: 密码错误但操作不需要密码是否可以继续？
**A**: 不可以。`requireWriteAuth` 中间件会检查：
- 如果设备没有密码 → 直接通过
- 如果设备有密码但未提供 → 拒绝
- 如果设备有密码但错误 → 拒绝

如果操作不需要密码，不要使用 `requireWriteAuth` 中间件。

---

## 迁移指南

### 从旧的认证系统迁移

**旧代码**:
```javascript
router.post('/kv/:namespace/:key', authMiddleware, handler);
```

**新代码**:
```javascript
// 选项1: 使用 deviceMiddleware (如果通过URL传递UUID)
router.post('/device/:deviceUuid/kv/:key',
  deviceMiddleware,
  requireWriteAuth,
  handler
);

// 选项2: 使用 tokenAuth (推荐，更安全)
router.post('/kv/:key', tokenAuth, handler);
```

### 客户端更新

**旧方式**:
```javascript
// UUID + 密码
fetch('/kv/device-uuid/mykey', {
  method: 'POST',
  headers: {
    'x-namespace-password': 'password'
  },
  body: JSON.stringify({ data: 'value' })
});
```

**新方式（选项1 - UUID）**:
```javascript
fetch('/device/device-uuid/kv/mykey', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'password',
    data: 'value'
  })
});
```

**新方式（选项2 - Token，推荐）**:
```javascript
// 先获取token
const authResponse = await fetch('/apps/1/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceUuid: 'device-uuid',
    password: 'password'
  })
});
const { token } = await authResponse.json();

// 使用token操作
fetch('/kv/mykey', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'value' })
});
```

---

## 技术细节

### 密码存储
密码使用 `bcrypt` 进行哈希处理，存储在 `Device.password` 字段。

**加密函数** (`utils/crypto.js`):
```javascript
import bcrypt from 'bcryptjs';

export async function hashDevicePassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyDevicePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### 性能优化
- 使用整数ID (`deviceId`) 作为外键，查询效率高于字符串UUID
- 设备信息查询结果缓存在 `res.locals`，避免重复查询
- 密码验证使用 bcrypt 的异步方法，不阻塞事件循环

### 安全考虑
1. 密码使用 bcrypt 加密存储
2. Token 使用 `cuid` 生成，具有高随机性
3. 支持密码提示功能，不暴露实际密码
4. 写操作强制密码验证（如果设置了密码）
5. 所有中间件使用 `errors.catchAsync` 包装，统一错误处理

---

## 参考

- [API重构文档](./API_REFACTOR.md)
- [Token认证示例](./token-auth-examples.md)
- [KV存储文档](./kv.md)
- [应用管理文档](./apps.md)