import { PrismaClient } from "@prisma/client";
import { verifyDevicePassword } from "../utils/crypto.js";
import errors from "../utils/errors.js";

const prisma = new PrismaClient();

/**
 * Token认证中间件
 *
 * 从请求中提取token，验证后将设备信息注入到res.locals
 * 同时将deviceId注入到req.params，以便后续路由使用
 *
 * Token可通过以下方式提供：
 * 1. Authorization header: Bearer <token>
 * 2. Query参数: ?token=<token>
 * 3. Body: {"token": "<token>"}
 */
export const tokenAuth = errors.catchAsync(async (req, res, next) => {
  let token;

  // 尝试从 headers, query, body 中获取 token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  } else if (req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return next(errors.createError(401, "未提供身份验证令牌"));
  }

  const appInstall = await prisma.appInstall.findUnique({
    where: { token },
    include: {
      app: true,
      device: true,
    },
  });

  if (!appInstall) {
    return next(errors.createError(401, "无效的身份验证令牌"));
  }

  // 将认证信息存储到res.locals
  res.locals.appInstall = appInstall;
  res.locals.app = appInstall.app;
  res.locals.device = appInstall.device;
  res.locals.deviceId = appInstall.device.id;

  // 将deviceId注入到req.params（向后兼容，某些路由可能需要namespace参数）
  req.params.namespace = appInstall.device.uuid;
  req.params.deviceId = appInstall.device.id;

  next();
});

/**
 * 写权限验证中间件
 *
 * 依赖于deviceMiddleware，必须在其后使用
 * 验证设备密码和写权限
 *
 * 逻辑：
 * 1. 如果设备没有设置密码，直接允许写入
 * 2. 如果设备设置了密码：
 *    - 验证提供的密码是否正确
 *    - 密码正确则允许写入
 *    - 密码错误或未提供则拒绝写入
 *
 * 使用方式：
 * router.post('/path', deviceMiddleware, requireWriteAuth, handler)
 * router.put('/path', deviceMiddleware, requireWriteAuth, handler)
 * router.delete('/path', deviceMiddleware, requireWriteAuth, handler)
 */
export const requireWriteAuth = errors.catchAsync(async (req, res, next) => {
  const device = res.locals.device;

  if (!device) {
    return next(errors.createError(500, "设备信息未加载，请确保使用了deviceMiddleware"));
  }

  // 如果设备没有设置密码，直接通过
  if (!device.password) {
    return next();
  }

  // 设备有密码，需要验证
  const providedPassword = req.body.password || req.query.password;

  if (!providedPassword) {
    return res.status(401).json({
      statusCode: 401,
      message: "此操作需要密码",
      passwordHint: device.passwordHint,
    });
  }

  // 验证密码
  const isValid = await verifyDevicePassword(providedPassword, device.password);

  if (!isValid) {
    return res.status(401).json({
      statusCode: 401,
      message: "密码错误",
    });
  }

  // 密码正确，继续
  next();
});