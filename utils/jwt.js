import jwt from 'jsonwebtoken';

// JWT密钥 - 生产环境应该从环境变量读取
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 默认7天过期

/**
 * 签发JWT token
 * @param {Object} payload - 要编码的数据
 * @returns {string} JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证JWT token
 * @param {string} token - JWT token
 * @returns {Object} 解码后的payload
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * 为账户生成JWT token
 * @param {Object} account - 账户对象
 * @returns {string} JWT token
 */
export function generateAccountToken(account) {
  return signToken({
    accountId: account.id,
    provider: account.provider,
    email: account.email,
    name: account.name,
    avatarUrl: account.avatarUrl,
  });
}