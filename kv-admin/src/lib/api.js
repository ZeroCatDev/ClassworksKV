const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'
const SITE_KEY = import.meta.env.VITE_SITE_KEY || ''

class ApiClient {
  constructor(baseUrl, siteKey) {
    this.baseUrl = baseUrl
    this.siteKey = siteKey
  }

  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-site-key': this.siteKey,
      ...options.headers,
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // 应用相关 API
  async getApps(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.fetch(`/apps${query ? `?${query}` : ''}`)
  }

  async getApp(appId) {
    return this.fetch(`/apps/${appId}`)
  }

  async getAppInstallations(appId, params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.fetch(`/apps/${appId}/installations${query ? `?${query}` : ''}`)
  }

  // 授权相关 API
  async authorizeApp(appId, data) {
    return this.fetch(`/apps/${appId}/authorize`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Token 管理 API
  async getDeviceTokens(deviceUuid) {
    return this.fetch(`/apps/devices/${deviceUuid}/tokens`)
  }

  async revokeToken(token) {
    return this.fetch(`/apps/tokens/${token}`, {
      method: 'DELETE',
    })
  }

  // 设备密码管理 API
  async setDevicePassword(deviceUuid, data) {
    return this.fetch(`/apps/devices/${deviceUuid}/password`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDevicePassword(deviceUuid, password) {
    return this.fetch(`/apps/devices/${deviceUuid}/password`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    })
  }

  async verifyDevicePassword(deviceUuid, password) {
    return this.fetch(`/apps/devices/${deviceUuid}/password/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  // 设备授权相关 API
  async bindDeviceCode(deviceCode, token) {
    return this.fetch('/auth/device/bind', {
      method: 'POST',
      body: JSON.stringify({ device_code: deviceCode, token }),
    })
  }

  async getDeviceCodeStatus(deviceCode) {
    return this.fetch(`/auth/device/status?device_code=${deviceCode}`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL, SITE_KEY)
