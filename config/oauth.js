// OAuth 提供者配置
export const oauthProviders = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizationURL: "https://github.com/login/oauth/authorize",
    tokenURL: "https://github.com/login/oauth/access_token",
    userInfoURL: "https://api.github.com/user",
    scope: "read:user user:email",
    name: "GitHub",
    icon: "github",
    color: "#24292e",
    description: "使用 GitHub 账号登录",
  },
  zerocat: {
    clientId: process.env.ZEROCAT_CLIENT_ID,
    clientSecret: process.env.ZEROCAT_CLIENT_SECRET,
    authorizationURL: "https://zerocat-api.houlangs.com/oauth/authorize",
    tokenURL: "https://zerocat-api.houlangs.com/oauth/token",
    userInfoURL: "https://zerocat-api.houlangs.com/oauth/userinfo",
    scope: "user:basic user:email",
    name: "ZeroCat",
    icon: "zerocat",
    color: "#6366f1",
    description: "使用 ZeroCat 账号登录",
  },
  hly: {
    // 厚浪云（Logto） - OIDC Provider
    clientId: process.env.HLY_CLIENT_ID,
    clientSecret: process.env.HLY_CLIENT_SECRET, // 可选：若使用PKCE且应用为Public，可不配置
    authorizationURL: "https://oauth.houlang.cloud/oidc/auth",
    tokenURL: "https://oauth.houlang.cloud/oidc/token",
    userInfoURL: "https://oauth.houlang.cloud/oidc/me",
    scope: "openid profile email offline_access",
    name: "厚浪云",
    icon: "logto",
    color: "#0ea5e9",
    description: "使用厚浪云账号登录",
    pkce: true, // 启用PKCE支持
  },
};

// 获取OAuth回调URL
export function getCallbackURL(provider) {
  const baseUrl = process.env.BASE_URL;
  return `${baseUrl}/accounts/oauth/${provider}/callback`;
}

// 生成随机state参数
export function generateState() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}