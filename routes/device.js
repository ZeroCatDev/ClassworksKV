import { Router } from "express";
const router = Router();
import { uuidAuth } from "../middleware/uuidAuth.js";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import errors from "../utils/errors.js";
import { hashPassword, verifyDevicePassword } from "../utils/crypto.js";
import { getOnlineDevices } from "../utils/socket.js";

const prisma = new PrismaClient();

/**
 * POST /devices
 * 注册新设备
 */
router.post(
  "/",
  errors.catchAsync(async (req, res, next) => {
    const { uuid, deviceName } = req.body;

    if (!uuid) {
      return next(errors.createError(400, "设备UUID是必需的"));
    }

    if (!deviceName) {
      return next(errors.createError(400, "设备名称是必需的"));
    }

    // 检查UUID是否已存在
    const existingDevice = await prisma.device.findUnique({
      where: { uuid },
    });

    if (existingDevice) {
      return next(errors.createError(409, "设备UUID已存在"));
    }

    // 创建设备
    const device = await prisma.device.create({
      data: {
        uuid,
        name: deviceName,
      },
    });

    return res.status(201).json({
      success: true,
      device: {
        id: device.id,
        uuid: device.uuid,
        name: device.name,
        createdAt: device.createdAt,
      },
    });
  })
);

/**
 * GET /devices/:uuid
 * 获取设备信息 (公开接口，无需认证)
 */
router.get(
  "/:uuid",
  errors.catchAsync(async (req, res, next) => {
    const { uuid } = req.params;

    // 查找设备，包含绑定的账户信息
    const device = await prisma.device.findUnique({
      where: { uuid },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!device) {
      return next(errors.createError(404, "设备不存在"));
    }

    return res.json({
        id: device.id,
        uuid: device.uuid,
        name: device.name,
        hasPassword: !!device.password,
        passwordHint: device.passwordHint,
        createdAt: device.createdAt,
        account: device.account ? {
          id: device.account.id,
          name: device.account.name,
          email: device.account.email,
          avatarUrl: device.account.avatarUrl,
        } : null,
        isBoundToAccount: !!device.account,
      });
  })
);/**
 * PUT /devices/:uuid/name
 * 设置设备名称 (需要UUID认证)
 */
router.put(
  "/:uuid/name",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const { name } = req.body;
    const device = res.locals.device;

    if (!name) {
      return next(errors.createError(400, "设备名称是必需的"));
    }

    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: { name },
    });

    return res.json({
      success: true,
      device: {
        id: updatedDevice.id,
        uuid: updatedDevice.uuid,
        name: updatedDevice.name,
        hasPassword: !!updatedDevice.password,
        passwordHint: updatedDevice.passwordHint,
      },
    });
  })
);

/**
 * POST /devices/:uuid/password
 * 初次设置设备密码 (无需认证，仅当设备未设置密码时)
 */
router.post(
  "/:uuid/password",
  errors.catchAsync(async (req, res, next) => {
    const { uuid } = req.params;
    const newPassword = req.query.newPassword || req.body.newPassword;

    if (!newPassword) {
      return next(errors.createError(400, "新密码是必需的"));
    }

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { uuid },
    });

    if (!device) {
      return next(errors.createError(404, "设备不存在"));
    }

    // 只有在设备未设置密码时才允许无认证设置
    if (device.password) {
      return next(errors.createError(403, "设备已设置密码，请使用修改密码接口"));
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.device.update({
      where: { id: device.id },
      data: {
        password: hashedPassword,
      },
    });

    return res.json({
      success: true,
      message: "密码设置成功",
    });
  })
);

/**
 * PUT /devices/:uuid/password
 * 修改设备密码 (需要UUID认证和当前密码验证，账户拥有者除外)
 */
router.put(
  "/:uuid/password",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const currentPassword = req.query.currentPassword;
    const newPassword = req.query.newPassword || req.body.newPassword;
    const passwordHint = req.query.passwordHint || req.body.passwordHint;
    const device = res.locals.device;
    const isAccountOwner = res.locals.isAccountOwner;

    if (!newPassword) {
      return next(errors.createError(400, "新密码是必需的"));
    }

    // 如果是账户拥有者，无需验证当前密码
    if (!isAccountOwner) {
      if (!device.password) {
        return next(errors.createError(400, "设备未设置密码，请使用设置密码接口"));
      }

      if (!currentPassword) {
        return next(errors.createError(400, "当前密码是必需的"));
      }

      // 验证当前密码
      const isCurrentPasswordValid = await verifyDevicePassword(currentPassword, device.password);
      if (!isCurrentPasswordValid) {
        return next(errors.createError(401, "当前密码错误"));
      }
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.device.update({
      where: { id: device.id },
      data: {
        password: hashedNewPassword,
        passwordHint: passwordHint !== undefined ? passwordHint : device.passwordHint,
      },
    });

    return res.json({
      success: true,
      message: "密码修改成功",
    });
  })
);

/**
 * PUT /devices/:uuid/password-hint
 * 设置密码提示 (需要UUID认证)
 */
router.put(
  "/:uuid/password-hint",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const { passwordHint } = req.body;
    const device = res.locals.device;

    await prisma.device.update({
      where: { id: device.id },
      data: { passwordHint: passwordHint || null },
    });

    return res.json({
      success: true,
      message: "密码提示设置成功",
      passwordHint: passwordHint || null,
    });
  })
);

/**
 * GET /devices/:uuid/password-hint
 * 获取设备密码提示 (无需认证)
 */
router.get(
  "/:uuid/password-hint",
  errors.catchAsync(async (req, res, next) => {
    const { uuid } = req.params;

    const device = await prisma.device.findUnique({
      where: { uuid },
      select: {
        passwordHint: true,
      },
    });

    if (!device) {
      return next(errors.createError(404, "设备不存在"));
    }

    return res.json({
      success: true,
      passwordHint: device.passwordHint || null,
    });
  })
);

/**
 * DELETE /devices/:uuid/password
 * 删除设备密码 (需要UUID认证和密码验证，账户拥有者除外)
 */
router.delete(
  "/:uuid/password",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const password = req.query.password;
    const device = res.locals.device;
    const isAccountOwner = res.locals.isAccountOwner;

    if (!device.password) {
      return next(errors.createError(400, "设备未设置密码"));
    }

    // 如果不是账户拥有者，需要验证密码
    if (!isAccountOwner) {
      if (!password) {
        return next(errors.createError(400, "密码是必需的"));
      }

      // 验证密码
      const isPasswordValid = await verifyDevicePassword(password, device.password);
      if (!isPasswordValid) {
        return next(errors.createError(401, "密码错误"));
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: {
        password: null,
        passwordHint: null,
      },
    });

    return res.json({
      success: true,
      message: "密码删除成功",
    });
  })
);

export default router;

/**
 * GET /devices/online
 * 查询在线设备（WebSocket 已连接）
 * 返回：[{ uuid, connections, name? }]
 */
router.get(
  "/online",
  errors.catchAsync(async (req, res) => {
    const list = getOnlineDevices();

    if (list.length === 0) {
      return res.json({ success: true, devices: [] });
    }

    // 补充设备名称
    const uuids = list.map((x) => x.uuid);
    const rows = await prisma.device.findMany({
      where: { uuid: { in: uuids } },
      select: { uuid: true, name: true },
    });
    const nameMap = new Map(rows.map((r) => [r.uuid, r.name]));

    const devices = list.map((x) => ({
      uuid: x.uuid,
      connections: x.connections,
      name: nameMap.get(x.uuid) || null,
    }));

    res.json({ success: true, devices });
  })
);