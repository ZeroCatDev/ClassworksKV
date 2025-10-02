/**
 * Token认证中间件系统
 *
 * 本系统完全基于Token进行认证，不再支持UUID+密码的认证方式。
 *
 * ## 推荐使用的认证中间件：
 *
 * ### 1. 纯Token认证中间件（推荐）
 * - `tokenOnlyAuthMiddleware`: 完整的Token认证，要求设备匹配
 * - `tokenOnlyReadAuthMiddleware`: Token读取权限认证
 * - `tokenOnlyWriteAuthMiddleware`: Token写入权限认证
 * - `appTokenAuthMiddleware`: 应用Token认证，不要求设备匹配
 *
 * ### 2. 应用权限认证中间件
 * - `appReadAuthMiddleware`: 应用读取权限（Token + 权限前缀检查）
 * - `appWriteAuthMiddleware`: 应用写入权限（Token + 权限前缀检查）
 * - `appListAuthMiddleware`: 应用列表权限（Token + 键过滤）
 *
 * ## Token获取方式：
 * Token可通过以下三种方式提供：
 * 1. HTTP Header: `x-app-token: your-token`
 * 2. 查询参数: `?apptoken=your-token`
 * 3. 请求体: `{\"apptoken\": \"your-token\"}`
 *
 * ## 认证成功响应：
 * 认证成功后，中间件会在 `res.locals` 中设置：
 * - `device`: 设备信息
 * - `appInstall`: 应用安装信息
 * - `app`: 应用信息
 * - `filterKeys`: 键过滤函数（仅限应用权限中间件）
 *
 * ## 认证失败响应：
 * - 401: Token无效或不存在
 * - 403: 权限不足或设备不匹配
 * - 404: 设备或应用不存在
 */

import { PrismaClient } from "@prisma/client";
import errors from "../utils/errors.js";

const prisma = new PrismaClient();

// 全局可读键列表
const GLOBAL_READABLE_KEYS = [
  "_info",
  "_check",
  "_hint",
  "_keys",
];

/**
 * 检查站点密钥
 */
export const checkSiteKey = (req, res, next) => {
  const siteKey = req.headers["x-site-key"] || req.query.sitekey || req.body?.sitekey;
  const expectedSiteKey = process.env.SITE_KEY;

  if (expectedSiteKey && siteKey !== expectedSiteKey) {
    return res.status(401).json({
      statusCode: 401,
      message: "无效的站点密钥",
    });
  }

  next();
};

/**
 * 通过Token获取设备信息
 * @param {string} token - 应用安装Token
 * @returns {Promise<Object|null>} 设备信息或null
 */
export const getDeviceByToken = async (token) => {
  if (!token) {
    return null;
  }

  try {
    const appInstall = await prisma.appInstall.findUnique({
      where: { token },
      include: {
        device: true,
        app: true,
      },
    });

    return appInstall;
  } catch (error) {
    console.error("获取设备信息时出错:", error);
    return null;
  }
};

/**
 * 从请求中提取Token
 * @param {Object} req - Express请求对象
 * @returns {string|null} Token或null
 */
const extractToken = (req) => {
  // 优先级：Header > Query > Body
  return (
    req.headers["x-app-token"] ||
    req.query.apptoken ||
    req.body?.apptoken ||
    null
  );
};

/**
 * 设备信息中间件（仅检查设备存在性，不进行认证）
 */
export const deviceInfoMiddleware = async (req, res, next) => {
  try {
    const { deviceUuid,namespace } = req.params;

    if (!deviceUuid&&!namespace) {
      return res.status(400).json({
        statusCode: 400,
        message: "缺少命名空间参数",
      });
    }

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { uuid: deviceUuid||namespace },
    });

    if (!device) {
      return res.status(404).json({
        statusCode: 404,
        message: "设备不存在",
      });
    }

    res.locals.device = device;
    next();
  } catch (error) {
    console.error("设备信息中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};

/**
 * 纯Token认证中间件（推荐使用）
 * 要求Token存在且对应的设备与请求的命名空间匹配
 */
export const tokenOnlyAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const { namespace } = req.params;

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: "缺少认证Token",
      });
    }

    const appInstall = await getDeviceByToken(token);
    if (!appInstall) {
      return res.status(401).json({
        statusCode: 401,
        message: "无效的Token",
      });
    }

    // 验证设备匹配
    if (namespace && appInstall.device.uuid !== namespace) {
      return res.status(403).json({
        statusCode: 403,
        message: "Token对应的设备与请求的命名空间不匹配",
      });
    }

    res.locals.device = appInstall.device;
    res.locals.appInstall = appInstall;
    res.locals.app = appInstall.app;
    next();
  } catch (error) {
    console.error("Token认证中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};

/**
 * 纯Token读取认证中间件
 */
export const tokenOnlyReadAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const { namespace } = req.params;

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: "缺少认证Token",
      });
    }

    const appInstall = await getDeviceByToken(token);
    if (!appInstall) {
      return res.status(401).json({
        statusCode: 401,
        message: "无效的Token",
      });
    }

    // 验证设备匹配
    if (namespace && appInstall.device.uuid !== namespace) {
      return res.status(403).json({
        statusCode: 403,
        message: "Token对应的设备与请求的命名空间不匹配",
      });
    }

    // 检查读取权限
    if (!appInstall.permissions?.read) {
      return res.status(403).json({
        statusCode: 403,
        message: "无读取权限",
      });
    }

    res.locals.device = appInstall.device;
    res.locals.appInstall = appInstall;
    res.locals.app = appInstall.app;
    next();
  } catch (error) {
    console.error("Token读取认证中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};

/**
 * 纯Token写入认证中间件
 */
export const tokenOnlyWriteAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const { namespace } = req.params;

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: "缺少认证Token",
      });
    }

    const appInstall = await getDeviceByToken(token);
    if (!appInstall) {
      return res.status(401).json({
        statusCode: 401,
        message: "无效的Token",
      });
    }

    // 验证设备匹配
    if (namespace && appInstall.device.uuid !== namespace) {
      return res.status(403).json({
        statusCode: 403,
        message: "Token对应的设备与请求的命名空间不匹配",
      });
    }

    // 检查写入权限
    if (!appInstall.permissions?.write) {
      return res.status(403).json({
        statusCode: 403,
        message: "无写入权限",
      });
    }

    res.locals.device = appInstall.device;
    res.locals.appInstall = appInstall;
    res.locals.app = appInstall.app;
    next();
  } catch (error) {
    console.error("Token写入认证中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};

/**
 * 应用Token认证中间件
 * 不要求设备匹配，适用于应用级别的操作
 */
export const appTokenAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: "缺少应用Token",
      });
    }

    const appInstall = await getDeviceByToken(token);
    if (!appInstall) {
      return res.status(401).json({
        statusCode: 401,
        message: "无效的应用Token",
      });
    }

    res.locals.device = appInstall.device;
    res.locals.appInstall = appInstall;
    res.locals.app = appInstall.app;
    next();
  } catch (error) {
    console.error("应用Token认证中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};

/**
 * 应用权限前缀检查中间件
 */
export const appPrefixAuthMiddleware = (req, res, next) => {
  const { key } = req.params;
  const app = res.locals.app;
  const appInstall = res.locals.appInstall;

  if (!app || !appInstall) {
    return res.status(401).json({
      statusCode: 401,
      message: "未认证的应用",
    });
  }

  // 检查是否为全局可读键
  if (GLOBAL_READABLE_KEYS.includes(key)) {
    return next();
  }

  // 检查权限前缀
  const permissionPrefix = app.permissionPrefix;
  if (!key.startsWith(permissionPrefix + ".")) {
    // 检查特殊权限
    const specialPermissions = appInstall.specialPermissions || [];
    const hasSpecialPermission = specialPermissions.some(permission =>
      key.startsWith(permission + ".") || key === permission
    );

    if (!hasSpecialPermission) {
      return res.status(403).json({
        statusCode: 403,
        message: `无权限访问键 '${key}'。需要权限前缀 '${permissionPrefix}.' 或特殊权限。`,
      });
    }
  }

  next();
};

/**
 * 应用读取权限中间件
 * 结合Token认证和权限前缀检查
 */
export const appReadAuthMiddleware = async (req, res, next) => {
  // 先进行Token认证
  await new Promise((resolve, reject) => {
    tokenOnlyReadAuthMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return; // 错误已经在tokenOnlyReadAuthMiddleware中处理
  });

  // 如果Token认证失败，直接返回
  if (res.headersSent) {
    return;
  }

  // 进行权限前缀检查
  appPrefixAuthMiddleware(req, res, next);
};

/**
 * 应用写入权限中间件
 * 结合Token认证和权限前缀检查
 */
export const appWriteAuthMiddleware = async (req, res, next) => {
  // 先进行Token认证
  await new Promise((resolve, reject) => {
    tokenOnlyWriteAuthMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return; // 错误已经在tokenOnlyWriteAuthMiddleware中处理
  });

  // 如果Token认证失败，直接返回
  if (res.headersSent) {
    return;
  }

  // 进行权限前缀检查
  appPrefixAuthMiddleware(req, res, next);
};

/**
 * 应用列表权限中间件
 * 用于过滤键列表，只显示应用有权限访问的键
 */
export const appListAuthMiddleware = async (req, res, next) => {
  // 先进行Token认证
  await new Promise((resolve, reject) => {
    tokenOnlyReadAuthMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return; // 错误已经在tokenOnlyReadAuthMiddleware中处理
  });

  // 如果Token认证失败，直接返回
  if (res.headersSent) {
    return;
  }

  const app = res.locals.app;
  const appInstall = res.locals.appInstall;

  if (app && appInstall) {
    // 设置键过滤函数
    res.locals.filterKeys = (keys) => {
      const permissionPrefix = app.permissionPrefix;
      const specialPermissions = appInstall.specialPermissions || [];

      return keys.filter(key => {
        // 全局可读键
        if (GLOBAL_READABLE_KEYS.includes(key)) {
          return true;
        }

        // 权限前缀匹配
        if (key.startsWith(permissionPrefix + ".")) {
          return true;
        }

        // 特殊权限匹配
        return specialPermissions.some(permission =>
          key.startsWith(permission + ".") || key === permission
        );
      });
    };
  }

  next();
};

/**
 * Token认证中间件，并将设备UUID注入为命名空间
 *
 * 这个中间件专门用于处理那些URL中不包含 `:namespace` 参数的路由。
 * 它会从Token中解析出设备信息，然后将设备的UUID（即命名空间）
 * 注入到 `req.params.namespace` 中。
 *
 * 这使得后续的中间件（如权限检查中间件）和路由处理器可以统一
 * 从 `req.params.namespace` 获取命名空间，而无需关心它最初是
 * 来自URL还是来自Token。
 *
 * 认证成功后，除了注入 `req.params.namespace`，还会在 `res.locals` 中设置：
 * - `device`: 设备信息
 * - `appInstall`: 应用安装信息
 * - `app`: 应用信息
 */
export const tokenAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: "缺少认证Token",
      });
    }

    const appInstall = await getDeviceByToken(token);
    if (!appInstall) {
      return res.status(401).json({
        statusCode: 401,
        message: "无效的Token",
      });
    }

    // 核心逻辑：将设备UUID注入req.params.namespace
    req.params.namespace = appInstall.device.uuid;

    // 存储认证信息以供后续使用
    res.locals.device = appInstall.device;
    res.locals.appInstall = appInstall;
    res.locals.app = appInstall.app;

    next();
  } catch (error) {
    console.error("Token认证与命名空间注入中间件错误:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "服务器内部错误",
    });
  }
};
