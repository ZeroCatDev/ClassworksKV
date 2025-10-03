/**
 * 纯账户JWT认证中间件
 *
 * 只验证账户JWT是否正确，不需要设备上下文
 * 适用于只需要账户验证的接口
 */

import { verifyToken } from "../utils/jwt.js";
import { PrismaClient } from "@prisma/client";
import errors from "../utils/errors.js";

const prisma = new PrismaClient();

/**
 * 纯JWT认证中间件
 * 只验证Bearer token并将账户信息存储到res.locals
 */
export const jwtAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(errors.createError(401, "需要提供有效的JWT token"));
    }

    const token = authHeader.substring(7);

    // 验证JWT token
    const decoded = verifyToken(token);

    // 从数据库获取账户信息
    const account = await prisma.account.findUnique({
      where: { id: decoded.accountId },
    });

    if (!account) {
      return next(errors.createError(401, "账户不存在"));
    }

    // 将账户信息存储到res.locals
    res.locals.account = account;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(errors.createError(401, "无效的JWT token"));
    }

    if (error.name === 'TokenExpiredError') {
      return next(errors.createError(401, "JWT token已过期"));
    }

    return next(errors.createError(500, "认证过程出错"));
  }
};