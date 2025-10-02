import { Router } from "express";
const router = Router();
import {
  deviceMiddleware,
  passwordMiddleware,
  deviceInfoMiddleware,
} from "../middleware/device.js";
import { checkSiteKey } from "../middleware/auth.js";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import errors from "../utils/errors.js";
import { hashPassword, verifyDevicePassword } from "../utils/crypto.js";

const prisma = new PrismaClient();

router.use(checkSiteKey);

/**
 * GET /apps
 * 获取应用列表
 */
router.get(
  "/",
  errors.catchAsync(async (req, res) => {
    const { limit = 20, skip = 0, search } = req.query;

    const where = search
      ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { developerName: { contains: search } },
        ],
      }
      : {};

    const [apps, total] = await Promise.all([
      prisma.app.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(skip),
        orderBy: { createdAt: "desc" },
      }),
      prisma.app.count({ where }),
    ]);

    res.json({
      apps,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  })
);

/**
 * GET /apps/:id
 * 获取单个应用详情
 */
router.get(
  "/:id",
  errors.catchAsync(async (req, res) => {
    const { id } = req.params;

    const app = await prisma.app.findUnique({
      where: { id: parseInt(id) },
    });

    if (!app) {
      return res.status(404).json({
        statusCode: 404,
        message: "应用不存在",
      });
    }

    res.json(app);
  })
);

/**
 * POST /apps/:id/authorize
 * 为应用授权获取token
 *
 * 使用统一的设备中间件：
 * 1. deviceMiddleware - 自动获取或创建设备
 * 2. passwordMiddleware - 验证密码（如果设备有密码）
 *
 * 请求体:
 * {
 *   "deviceUuid": "设备UUID",
 *   "password": "设备密码（如果设备有密码则必须提供）",
 *   "note": "备注信息"  // 可选
 * }
 */
router.post(
  "/:id/authorize",
  deviceMiddleware,
  passwordMiddleware,
  errors.catchAsync(async (req, res) => {
    const { id: appId } = req.params;
    const { note } = req.body;
    const device = res.locals.device;

    // 检查应用是否存在
    const app = await prisma.app.findUnique({
      where: { id: Number(appId) },
    });

    if (!app) {
      return res.status(404).json({
        statusCode: 404,
        message: "应用不存在",
      });
    }

    // 生成token
    const randomBytes = crypto.randomBytes(32);
    const tokenData = `${appId}-${device.uuid}-${Date.now()}-${randomBytes.toString('hex')}`;
    const token = crypto.createHash("sha256").update(tokenData).digest("hex");

    // 创建应用安装记录
    const appInstall = await prisma.appInstall.create({
      data: {
        deviceId: device.id,
        appId: Number(appId),
        token,
        note: note || "授权访问",
      },
    });

    res.status(200).json({
      token: appInstall.token,
      appId: Number(appId),
      appName: app.name,
      deviceUuid: device.uuid,
      deviceName: device.name,
      note: appInstall.note,
      authorizedAt: appInstall.installedAt,

    });
  })
);

/**
 * GET /apps/devices/:deviceUuid/tokens
 * 获取设备上的所有授权token
 */
router.get(
  "/devices/:deviceUuid/tokens",
  deviceInfoMiddleware,
  errors.catchAsync(async (req, res) => {
    const device = res.locals.device;

    const installations = await prisma.appInstall.findMany({
      where: { deviceId: device.id },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            description: true,
            developerName: true,
            iconHash: true,
            repositoryUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { installedAt: "desc" },
    });

    res.json({
      deviceUuid: device.uuid,
      deviceName: device.name,
      tokens: installations.map(install => ({
        id: install.id,
        token: install.token,
        app: install.app,
        note: install.note,
        installedAt: install.installedAt,
        updatedAt: install.updatedAt,
        createdAt: install.createdAt,
        repositoryUrl: install.app.repositoryUrl,
     })),
      total: installations.length,
    });
  })
);

/**
 * DELETE /apps/tokens/:token
 * 撤销特定token
 */
router.delete(
  "/tokens/:token",
  errors.catchAsync(async (req, res) => {
    const { token } = req.params;

    const result = await prisma.appInstall.deleteMany({
      where: { token },
    });

    if (result.count === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Token不存在",
      });
    }

    res.status(204).end();
  })
);

/**
 * GET /apps/:id/installations
 * 获取应用的所有安装记录
 */
router.get(
  "/:id/installations",
  errors.catchAsync(async (req, res) => {
    const { id: appId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const [installations, total] = await Promise.all([
      prisma.appInstall.findMany({
        where: { appId: Number(appId) },
        include: {
          device: {
            select: {
              uuid: true,
              name: true,
            },
          },
        },
        take: parseInt(limit),
        skip: parseInt(skip),
        orderBy: { installedAt: "desc" },
      }),
      prisma.appInstall.count({ where: { appId: Number(appId) } }),
    ]);

    res.json({
      appId: Number(appId),
      installations: installations.map(install => ({
        id: install.id,
        token: install.token,
        device: install.device,
        note: install.note,
        installedAt: install.installedAt,
        updatedAt: install.updatedAt,
      })),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  })
);

/**
 * PUT /apps/devices/:deviceUuid/password
 * 设置或更新设备密码
 *
 * Request Body:
 * {
 *   "newPassword": "新密码",
 *   "passwordHint": "密码提示（可选）",
 *   "currentPassword": "当前密码（如果已设置密码则必须提供）"
 * }
 */
router.put(
  "/devices/:deviceUuid/password",
  deviceInfoMiddleware,
  errors.catchAsync(async (req, res, next) => {
    const { newPassword, passwordHint, currentPassword } = req.body;
    const device = res.locals.device;

    if (!newPassword) {
      return next(errors.createError(400, "请提供新密码"));
    }

    // 如果设备已有密码，必须先验证当前密码
    if (device.password) {
      if (!currentPassword) {
        return next(errors.createError(401, "设备已设置密码，请提供当前密码"));
      }

      const isValid = await verifyDevicePassword(currentPassword, device.password);
      if (!isValid) {
        return next(errors.createError(401, "当前密码错误"));
      }
    }

    // 哈希新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新设备密码
    await prisma.device.update({
      where: { id: device.id },
      data: {
        password: hashedPassword,
        passwordHint: passwordHint || device.passwordHint,
      },
    });

    res.json({
      success: true,
      message: device.password ? "密码已更新" : "密码已设置",
      deviceUuid: device.uuid,
    });
  })
);

/**
 * DELETE /apps/devices/:deviceUuid/password
 * 删除设备密码
 *
 * Request Body:
 * {
 *   "password": "当前密码（必须）"
 * }
 */
router.delete(
  "/devices/:deviceUuid/password",
  deviceInfoMiddleware,
  errors.catchAsync(async (req, res, next) => {
    const { password } = req.body;
    const device = res.locals.device;

    if (!device.password) {
      return next(errors.createError(400, "设备未设置密码"));
    }

    if (!password) {
      return next(errors.createError(401, "请提供当前密码"));
    }

    // 验证密码
    const isValid = await verifyDevicePassword(password, device.password);
    if (!isValid) {
      return next(errors.createError(401, "密码错误"));
    }

    // 删除密码
    await prisma.device.update({
      where: { id: device.id },
      data: {
        password: null,
        passwordHint: null,
      },
    });

    res.json({
      success: true,
      message: "密码已删除",
      deviceUuid: device.uuid,
    });
  })
);

/**
 * POST /apps/devices/:deviceUuid/password/verify
 * 验证设备密码
 *
 * Request Body:
 * {
 *   "password": "待验证的密码"
 * }
 */
router.post(
  "/devices/:deviceUuid/password/verify",
  deviceInfoMiddleware,
  errors.catchAsync(async (req, res, next) => {
    const { password } = req.body;
    const device = res.locals.device;

    if (!device.password) {
      return next(errors.createError(400, "设备未设置密码"));
    }

    if (!password) {
      return next(errors.createError(400, "请提供密码"));
    }

    // 验证密码
    const isValid = await verifyDevicePassword(password, device.password);

    res.json({
      valid: isValid,
    });
  })
);

export default router;