import { Router } from "express";
const router = Router();
import { uuidAuth } from "../middleware/uuidAuth.js";
import { jwtAuth } from "../middleware/jwt-auth.js";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import errors from "../utils/errors.js";

const prisma = new PrismaClient();

/**
 * GET /apps/devices/:uuid/apps
 * 获取设备安装的应用列表 (公开接口，无需认证)
 */
router.get(
  "/devices/:uuid/apps",
  errors.catchAsync(async (req, res, next) => {
    const { uuid } = req.params;

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { uuid },
    });

    if (!device) {
      return next(errors.createError(404, "设备不存在"));
    }

    const installations = await prisma.appInstall.findMany({
      where: { deviceId: device.id },
    });

    const apps = installations.map(install => ({
      appId: install.appId,
      token: install.token,
      note: install.note,
      installedAt: install.createdAt,
    }));

    return res.json({
      success: true,
      apps,
    });
  })
);

/**
 * POST /apps/devices/:uuid/install/:appId
 * 为设备安装应用 (需要UUID认证)
 * appId 现在是 SHA256 hash
 */
router.post(
  "/devices/:uuid/install/:appId",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const device = res.locals.device;
    const { appId } = req.params;
    const { note } = req.body;

    // 生成token
    const token = crypto.randomBytes(32).toString("hex");

    // 创建安装记录
    const installation = await prisma.appInstall.create({
      data: {
        deviceId: device.id,
        appId: appId,
        token,
        note: note || null,
      },
    });

    return res.status(201).json({
        id: installation.id,
        appId: installation.appId,
        token: installation.token,
        note: installation.note,
        name: installation.note, // 备注同时作为名称返回
        installedAt: installation.createdAt,
      });
  })
);

/**
 * DELETE /apps/devices/:uuid/uninstall/:installId
 * 卸载设备应用 (需要UUID认证)
 */
router.delete(
  "/devices/:uuid/uninstall/:installId",
  uuidAuth,
  errors.catchAsync(async (req, res, next) => {
    const device = res.locals.device;
    const { installId } = req.params;

    const installation = await prisma.appInstall.findUnique({
      where: { id: installId },
    });

    if (!installation) {
      return next(errors.createError(404, "应用未安装"));
    }

    // 确保安装记录属于当前设备
    if (installation.deviceId !== device.id) {
      return next(errors.createError(403, "无权操作此安装记录"));
    }

    await prisma.appInstall.delete({
      where: { id: installation.id },
    });

    return res.status(204).end();
  })
);

/**
 * GET /apps/tokens
 * 获取设备的token列表 (需要设备UUID)
 */
router.get(
  "/tokens",
  errors.catchAsync(async (req, res, next) => {
    const { uuid } = req.query;

    if (!uuid) {
      return next(errors.createError(400, "需要提供设备UUID"));
    }

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { uuid },
    });

    if (!device) {
      return next(errors.createError(404, "设备不存在"));
    }

    // 获取该设备的所有应用安装记录（即token）
    const installations = await prisma.appInstall.findMany({
      where: { deviceId: device.id },
      orderBy: { installedAt: 'desc' },
    });

    const tokens = installations.map(install => ({
      id: install.id,
      token: install.token,
      appId: install.appId,
      installedAt: install.installedAt,
      note: install.note,
      name: install.note, // 备注同时作为名称返回
    }));

    return res.json({
      success: true,
      tokens,
      deviceUuid: uuid,
    });
  })
);

export default router;