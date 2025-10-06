import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { oauthProviders, getCallbackURL, generateState } from "../config/oauth.js";
import { generateAccountToken, verifyToken } from "../utils/jwt.js";
import { jwtAuth } from "../middleware/jwt-auth.js";

const router = Router();
const prisma = new PrismaClient();

// 存储OAuth state，防止CSRF攻击（生产环境应使用Redis等）
const oauthStates = new Map();

/**
 * 生成安全的访问令牌
 */
function generateAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 获取支持的OAuth提供者列表
 * GET /accounts/oauth/providers
 */
router.get("/oauth/providers", (req, res) => {
  const providers = [];

  for (const [key, config] of Object.entries(oauthProviders)) {
    // 只返回已配置的提供者
    if (config.clientId && config.clientSecret) {
      providers.push({
        id: key,
        name: config.name,
        icon: config.icon,
        color: config.color,
        description: config.description,
        authUrl: `/accounts/oauth/${key}`, // 前端用于发起认证的URL
      });
    }
  }

  res.json({
    success: true,
    data: providers,
  });
});

/**
 * 发起OAuth认证
 * GET /accounts/oauth/:provider
 *
 * Query参数:
 * - redirect_uri: 前端回调地址（可选）
 */
router.get("/oauth/:provider", (req, res) => {
  const { provider } = req.params;
  const { redirect_uri } = req.query;

  const providerConfig = oauthProviders[provider];
  if (!providerConfig) {
    return res.status(400).json({
      success: false,
      message: `不支持的OAuth提供者: ${provider}`,
    });
  }

  if (!providerConfig.clientId || !providerConfig.clientSecret) {
    return res.status(500).json({
      success: false,
      message: `OAuth提供者 ${provider} 未配置`,
    });
  }

  // 生成state参数
  const state = generateState();

  // 保存state和redirect_uri（5分钟过期）
  oauthStates.set(state, {
    provider,
    redirect_uri,
    timestamp: Date.now(),
  });

  // 清理过期的state（超过5分钟）
  for (const [key, value] of oauthStates.entries()) {
    if (Date.now() - value.timestamp > 5 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  // 构建授权URL
  const params = new URLSearchParams({
    client_id: providerConfig.clientId,
    redirect_uri: getCallbackURL(provider),
    scope: providerConfig.scope,
    state: state,
    response_type: "code",
  });

  // Google需要额外的参数
  if (provider === "google") {
    params.append("access_type", "offline");
    params.append("prompt", "consent");
  }

  const authUrl = `${providerConfig.authorizationURL}?${params.toString()}`;

  // 重定向到OAuth提供者
  res.redirect(authUrl);
});

/**
 * OAuth回调处理
 * GET /accounts/oauth/:provider/callback
 */
router.get("/oauth/:provider/callback", async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  // 如果OAuth提供者返回错误
  if (error) {
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorUrl = new URL(frontendBaseUrl);
    errorUrl.searchParams.append("error", error);
    errorUrl.searchParams.append("provider", provider);
    errorUrl.searchParams.append("success", "false");
    return res.redirect(errorUrl.toString());
  }

  // 验证state
  const stateData = oauthStates.get(state);
  if (!stateData || stateData.provider !== provider) {
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorUrl = new URL(frontendBaseUrl);
    errorUrl.searchParams.append("error", "invalid_state");
    errorUrl.searchParams.append("provider", provider);
    errorUrl.searchParams.append("success", "false");
    return res.redirect(errorUrl.toString());
  }

  // 删除已使用的state
  oauthStates.delete(state);

  const providerConfig = oauthProviders[provider];

  try {
    // 1. 使用授权码换取访问令牌
    const tokenResponse = await fetch(providerConfig.tokenURL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: getCallbackURL(provider),
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("获取访问令牌失败");
    }

    // 2. 使用访问令牌获取用户信息
    const userResponse = await fetch(providerConfig.userInfoURL, {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/json",
      },
    });

    const userData = await userResponse.json();

    // 3. 标准化用户数据（不同提供者返回的字段不同）
    let normalizedUser = {};

    if (provider === "github") {
      normalizedUser = {
        providerId: String(userData.id),
        email: userData.email,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
      };
    } else if (provider === "zerocat") {
      normalizedUser = {
        providerId: userData.openid,
        email: userData.email_verified ? userData.email : null,
        name: userData.nickname || userData.username,
        avatarUrl: userData.avatar,
      };
    }

    // 4. 查找或创建账户
    let account = await prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: normalizedUser.providerId,
        },
      },
    });

    if (account) {
      // 更新账户信息
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          email: normalizedUser.email || account.email,
          name: normalizedUser.name || account.name,
          avatarUrl: normalizedUser.avatarUrl || account.avatarUrl,
          providerData: userData,
          refreshToken: tokenData.refresh_token || account.refreshToken,
          updatedAt: new Date(),
        },
      });
    } else {
      // 创建新账户
      const accessToken = generateAccessToken();
      account = await prisma.account.create({
        data: {
          provider,
          providerId: normalizedUser.providerId,
          email: normalizedUser.email,
          name: normalizedUser.name,
          avatarUrl: normalizedUser.avatarUrl,
          providerData: userData,
          accessToken,
          refreshToken: tokenData.refresh_token,
        },
      });
    }

    // 5. 生成JWT token
    const jwtToken = generateAccountToken(account);

    // 6. 重定向到前端根路径，携带JWT token
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const callbackUrl = new URL(frontendBaseUrl);
    callbackUrl.searchParams.append("token", jwtToken);
    callbackUrl.searchParams.append("provider", provider);
    callbackUrl.searchParams.append("success", "true");

    res.redirect(callbackUrl.toString());

  } catch (error) {
    console.error(`OAuth回调处理失败 [${provider}]:`, error);

    // 重定向到前端根路径，携带错误信息
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const errorUrl = new URL(frontendBaseUrl);
    errorUrl.searchParams.append("error", error.message);
    errorUrl.searchParams.append("provider", provider);
    errorUrl.searchParams.append("success", "false");

    res.redirect(errorUrl.toString());
  }
});

/**
 * 获取账户信息
 * GET /api/accounts/profile
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.get("/profile", jwtAuth, async (req, res, next) => {
  try {
    const accountContext = res.locals.account;

    const account = await prisma.account.findUnique({
      where: { id: accountContext.id },
      include: {
        devices: {
          select: {
            id: true,
            uuid: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: account.id,
        provider: account.provider,
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
        devices: account.devices,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 绑定设备到账户
 * POST /api/accounts/devices/bind
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 *
 * Body:
 * {
 *   uuid: string  // 设备UUID
 * }
 */
router.post("/devices/bind", jwtAuth, async (req, res, next) => {
  try {
    const accountContext = res.locals.account;
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: "缺少设备UUID",
      });
    }

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { uuid },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "设备不存在 #1",
      });
    }

    // 检查设备是否已绑定其他账户
  if (device.accountId && device.accountId !== accountContext.id) {
      return res.status(400).json({
        success: false,
        message: "设备已绑定其他账户",
      });
    }

    // 绑定设备到账户
    const updatedDevice = await prisma.device.update({
      where: { uuid },
      data: {
        accountId: accountContext.id,
      },
    });

    res.json({
      success: true,
      message: "设备绑定成功",
      data: {
        deviceId: updatedDevice.id,
        uuid: updatedDevice.uuid,
        name: updatedDevice.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 解绑设备
 * POST /api/accounts/devices/unbind
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 *
 * Body:
 * {
 *   uuid: string  // 设备UUID（单个解绑）
 *   uuids: string[]  // 设备UUID数组（批量解绑）
 * }
 */
router.post("/devices/unbind", jwtAuth, async (req, res, next) => {
  try {
    const accountContext = res.locals.account;
    const { uuid, uuids } = req.body;

    // 支持单个解绑或批量解绑
    const uuidsToUnbind = uuids || (uuid ? [uuid] : []);

    if (uuidsToUnbind.length === 0) {
      return res.status(400).json({
        success: false,
        message: "请提供要解绑的设备UUID",
      });
    }

    // 查找所有设备并验证所有权
    const devices = await prisma.device.findMany({
      where: {
        uuid: { in: uuidsToUnbind },
      },
    });

    // 检查是否有不存在的设备
    if (devices.length !== uuidsToUnbind.length) {
      const foundUuids = devices.map(d => d.uuid);
      const notFoundUuids = uuidsToUnbind.filter(u => !foundUuids.includes(u));
      return res.status(404).json({
        success: false,
        message: `以下设备不存在: ${notFoundUuids.join(', ')}`,
      });
    }

    // 检查所有权
  const unauthorizedDevices = devices.filter(d => d.accountId !== accountContext.id);
    if (unauthorizedDevices.length > 0) {
      return res.status(403).json({
        success: false,
        message: `您没有权限解绑以下设备: ${unauthorizedDevices.map(d => d.uuid).join(', ')}`,
      });
    }

    // 批量解绑设备
    await prisma.device.updateMany({
      where: {
        uuid: { in: uuidsToUnbind },
        accountId: accountContext.id,
      },
      data: {
        accountId: null,
      },
    });

    res.json({
      success: true,
      message: uuidsToUnbind.length === 1 ? "设备解绑成功" : `成功解绑 ${uuidsToUnbind.length} 个设备`,
      unboundCount: uuidsToUnbind.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取账户绑定的设备列表
 * GET /api/accounts/devices
 *
 * Headers:
 * Authorization: Bearer <JWT Token>
 */
router.get("/devices", jwtAuth, async (req, res, next) => {
  try {
    const accountContext = res.locals.account;
    // 获取账户的设备列表
    const account = await prisma.account.findUnique({
      where: { id: accountContext.id },
      include: {
        devices: {
          select: {
            id: true,
            uuid: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: account.devices,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 根据设备UUID获取账户公开信息
 * GET /accounts/device/:uuid/account
 *
 * 无需认证，返回公开信息
 */
router.get("/device/:uuid/account", async (req, res, next) => {
  try {
    const { uuid } = req.params;

    // 查找设备及其关联的账户
    const device = await prisma.device.findUnique({
      where: { uuid },
      include: {
        account: {
          select: {
            id: true,
            provider: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "设备不存在 #2",
      });
    }

    if (!device.account) {
      return res.json({
        success: true,
        data: null, // 设备未绑定账户
      });
    }

    res.json({
      success: true,
      data: {
        id: device.account.id,
        provider: device.account.provider,
        name: device.account.name,
        avatarUrl: device.account.avatarUrl,
        bindTime: device.updatedAt, // 绑定时间
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;