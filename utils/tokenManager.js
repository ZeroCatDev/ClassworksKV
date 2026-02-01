import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {prisma} from './prisma.js';

// Token 配置
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-access-token-secret-change-this-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change-this-in-production';

// Token 过期时间配置
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // 15分钟
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // 7天

// JWT 算法配置
const JWT_ALG = (process.env.JWT_ALG || 'HS256').toUpperCase();

// RS256 密钥对（如果使用RSA算法）
const ACCESS_TOKEN_PRIVATE_KEY = process.env.ACCESS_TOKEN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const ACCESS_TOKEN_PUBLIC_KEY = process.env.ACCESS_TOKEN_PUBLIC_KEY?.replace(/\\n/g, '\n');
const REFRESH_TOKEN_PRIVATE_KEY = process.env.REFRESH_TOKEN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const REFRESH_TOKEN_PUBLIC_KEY = process.env.REFRESH_TOKEN_PUBLIC_KEY?.replace(/\\n/g, '\n');

/**
 * 获取签名和验证密钥
 */
function getKeys(tokenType = 'access') {
    if (JWT_ALG === 'RS256') {
        const privateKey = tokenType === 'access' ? ACCESS_TOKEN_PRIVATE_KEY : REFRESH_TOKEN_PRIVATE_KEY;
        const publicKey = tokenType === 'access' ? ACCESS_TOKEN_PUBLIC_KEY : REFRESH_TOKEN_PUBLIC_KEY;

        if (!privateKey || !publicKey) {
            throw new Error(`RS256 需要同时提供 ${tokenType.toUpperCase()}_TOKEN_PRIVATE_KEY 与 ${tokenType.toUpperCase()}_TOKEN_PUBLIC_KEY`);
        }
        return {signKey: privateKey, verifyKey: publicKey};
    }

    // 默认 HS256
    const secret = tokenType === 'access' ? ACCESS_TOKEN_SECRET : REFRESH_TOKEN_SECRET;
    return {signKey: secret, verifyKey: secret};
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(account) {
    const {signKey} = getKeys('access');

    const payload = {
        type: 'access',
        accountId: account.id,
        provider: account.provider,
        email: account.email,
        name: account.name,
        avatarurl: account.avatarurl,
        tokenversion: account.tokenversion || 1,
    };

    return jwt.sign(payload, signKey, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        algorithm: JWT_ALG,
        issuer: 'ClassworksKV',
        audience: 'classworks-client',
    });
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(account) {
    const {signKey} = getKeys('refresh');

    const payload = {
        type: 'refresh',
        accountId: account.id,
        tokenversion: account.tokenversion || 1,
        // 添加随机字符串增加安全性
        jti: crypto.randomBytes(16).toString('hex'),
    };

    return jwt.sign(payload, signKey, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        algorithm: JWT_ALG,
        issuer: 'ClassworksKV',
        audience: 'classworks-client',
    });
}

/**
 * 验证访问令牌
 */
export function verifyAccessToken(token) {
    const {verifyKey} = getKeys('access');

    try {
        const decoded = jwt.verify(token, verifyKey, {
            algorithms: [JWT_ALG],
            issuer: 'ClassworksKV',
            audience: 'classworks-client',
        });

        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw error;
    }
}

/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token) {
    const {verifyKey} = getKeys('refresh');

    try {
        const decoded = jwt.verify(token, verifyKey, {
            algorithms: [JWT_ALG],
            issuer: 'ClassworksKV',
            audience: 'classworks-client',
        });

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        throw error;
    }
}

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 */
export async function generateTokenPair(account) {
    const accesstoken = generateAccessToken(account);
    const refreshtoken = generateRefreshToken(account);

    // 计算刷新令牌过期时间
    const refreshtokenExpiry = new Date();
    const expiresInMs = parseExpirationToMs(REFRESH_TOKEN_EXPIRES_IN);
    refreshtokenExpiry.setTime(refreshtokenExpiry.getTime() + expiresInMs);

    // 更新数据库中的刷新令牌
    await prisma.account.update({
        where: {id: account.id},
        data: {
            refreshtoken,
            refreshtokenExpiry,
            updatedat: new Date(),
        },
    });

    return {
        accesstoken,
        refreshtoken,
        accesstokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
        refreshtokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
    };
}

/**
 * 刷新访问令牌
 */
export async function refreshAccessToken(refreshtoken) {
    try {
        // 验证刷新令牌
        const decoded = verifyRefreshToken(refreshtoken);

        // 从数据库获取账户信息
        const account = await prisma.account.findUnique({
            where: {id: decoded.accountId},
        });

        if (!account) {
            throw new Error('Account not found');
        }

        // 验证刷新令牌是否匹配
        if (account.refreshtoken !== refreshtoken) {
            throw new Error('Invalid refresh token');
        }

        // 验证刷新令牌是否过期
        if (account.refreshtokenExpiry && account.refreshtokenExpiry < new Date()) {
            throw new Error('Refresh token expired');
        }

        // 验证令牌版本
        if (account.tokenversion !== decoded.tokenversion) {
            throw new Error('Token version mismatch');
        }

        // 生成新的访问令牌
        const newAccessToken = generateAccessToken(account);

        return {
            accesstoken: newAccessToken,
            accesstokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
            account: {
                id: account.id,
                provider: account.provider,
                email: account.email,
                name: account.name,
                avatarurl: account.avatarurl,
            },
        };
    } catch (error) {
        throw error;
    }
}

/**
 * 撤销所有令牌（登出所有设备）
 */
export async function revokeAllTokens(accountId) {
    await prisma.account.update({
        where: {id: accountId},
        data: {
            tokenversion: {increment: 1},
            refreshtoken: null,
            refreshtokenExpiry: null,
            updatedat: new Date(),
        },
    });
}

/**
 * 撤销当前刷新令牌（登出当前设备）
 */
export async function revokeRefreshToken(accountId) {
    await prisma.account.update({
        where: {id: accountId},
        data: {
            refreshtoken: null,
            refreshtokenExpiry: null,
            updatedat: new Date(),
        },
    });
}

/**
 * 解析过期时间字符串为毫秒
 */
function parseExpirationToMs(expiresIn) {
    if (typeof expiresIn === 'number') {
        return expiresIn * 1000;
    }

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            throw new Error('Invalid time unit');
    }
}

/**
 * 验证账户并检查令牌版本
 */
export async function validateAccountToken(decoded) {
    const account = await prisma.account.findUnique({
        where: {id: decoded.accountId},
    });

    if (!account) {
        throw new Error('Account not found');
    }

    // 验证令牌版本
    if (account.tokenversion !== decoded.tokenversion) {
        throw new Error('Token version mismatch');
    }

    return account;
}

// 向后兼容的导出
export const signToken = generateAccessToken;
export const verifyToken = verifyAccessToken;
export const generateAccountToken = generateAccessToken;