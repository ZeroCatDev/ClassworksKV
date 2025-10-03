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

  // 带认证的fetch
  async authenticatedFetch(endpoint, options = {}, token = null) {
    const headers = {
      ...options.headers,
    }

    // 如果提供了token，添加Authorization头
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.fetch(endpoint, {
      ...options,
      headers,
    })
  }

  // 应用相关 API
  async getApps(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.fetch(`/apps${query ? `?${query}` : ''}`)
  }

  async getApp(appId) {
    return this.fetch(`/apps/info/${appId}`)
  }

  async getAppInstallations(appId, deviceUuid, params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.fetch(`/apps/info/${appId}/device-installations${query ? `?${query}` : ''}`, {
      headers: {
        'x-device-uuid': deviceUuid,
      },
    })
  }

  // Token 管理 API
  async getDeviceTokens(deviceUuid, options = {}) {
    const params = new URLSearchParams({
      uuid: deviceUuid,
    });

    return this.fetch(`/apps/tokens?${params}`);
  }

  async revokeToken(targetToken, authOptions = {}) {
    const { deviceUuid, password, usePathParam = true, bearerToken } = authOptions;

    if (usePathParam) {
      // 使用路径参数方式 (推荐)
      const headers = {};

      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      } else if (deviceUuid) {
        headers['x-device-uuid'] = deviceUuid;
        if (password) {
          headers['x-device-password'] = password;
        }
      }

      return this.fetch(`/apps/tokens/${targetToken}`, {
        method: 'DELETE',
        headers,
      });
    } else {
      // 使用查询参数方式 (向后兼容)
      const params = new URLSearchParams({ token: targetToken });
      const headers = {};

      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      } else if (deviceUuid) {
        headers['x-device-uuid'] = deviceUuid;
        if (password) {
          headers['x-device-password'] = password;
        }
      }

      return this.fetch(`/apps/tokens?${params}`, {
        method: 'DELETE',
        headers,
      });
    }
  }

  // 应用安装接口 (对应后端的 /apps/devices/:uuid/install/:appId)
  async authorizeApp(appId, deviceUuid, options = {}) {
    const { password, note, token } = options;

    const headers = {
      'x-device-uuid': deviceUuid,
    };


    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 使用新的安装接口
    return this.fetch(`/apps/devices/${deviceUuid}/install/${appId}?password=${password}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note: note || '应用授权' }),
    });
  }

  // 设备级别的应用卸载，使用新的 uninstall 接口
  async revokeDeviceToken(deviceUuid, installId, password = null, token = null) {
    const params = new URLSearchParams({ uuid: deviceUuid });
    const headers = {};

    if (password) {
      params.set('password', password);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.fetch(`/apps/devices/${deviceUuid}/uninstall/${installId}?${params}`, {
      method: 'DELETE',
      headers,
    });
  }

  // 设备密码管理 API
  async setDevicePassword(deviceUuid, data, token = null) {
    const { newPassword, currentPassword, passwordHint } = data;

    // 检查设备是否已设置密码
    const deviceInfo = await this.getDeviceInfo(deviceUuid);
    const hasPassword = deviceInfo.hasPassword;

    if (hasPassword) {
      // 使用PUT修改密码
      const params = new URLSearchParams();
      params.set('uuid', deviceUuid);
      params.set('newPassword', newPassword);
      if (currentPassword) {
        params.set('currentPassword', currentPassword);
      }
      if (passwordHint !== undefined) {
        params.set('passwordHint', passwordHint);
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return this.fetch(`/devices/${deviceUuid}/password?${params}`, {
        method: 'PUT',
        headers,
      });
    } else {
      // 使用POST初次设置密码
      const params = new URLSearchParams();
      params.set('newPassword', newPassword);
      if (passwordHint !== undefined) {
        params.set('passwordHint', passwordHint);
      }

      return this.fetch(`/devices/${deviceUuid}/password?${params}`, {
        method: 'POST',
      });
    }
  }

  async deleteDevicePassword(deviceUuid, password, token = null) {
    const params = new URLSearchParams({ uuid: deviceUuid });
    const headers = {};

    // 如果提供了账户token，使用JWT认证
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (password) {
      params.set('password', password);
    }

    return this.fetch(`/devices/${deviceUuid}/password?${params}`, {
      method: 'DELETE',
      headers,
    });
  }

  async setDevicePasswordHint(deviceUuid, hint, password = null, token = null) {
    return this.authenticatedFetch(`/devices/${deviceUuid}/password-hint`, {
      method: 'PUT',
      body: JSON.stringify({ hint, password }),
    }, token)
  }

  async getDevicePasswordHint(deviceUuid) {
    return this.fetch(`/devices/${deviceUuid}/password-hint`)
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

  // KV 存储管理 API
  async listKVItems(token, params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.fetch(`/kv${query ? `?${query}` : ''}`, {
      headers: { 'x-app-token': token }
    })
  }

  async getKVItem(token, key) {
    return this.fetch(`/kv/${encodeURIComponent(key)}`, {
      headers: { 'x-app-token': token }
    })
  }

  async setKVItem(token, key, value) {
    return this.fetch(`/kv/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'x-app-token': token },
      body: JSON.stringify(value),
    })
  }

  async deleteKVItem(token, key) {
    return this.fetch(`/kv/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'x-app-token': token }
    })
  }

  async getKVKeys(token, pattern = '*') {
    return this.fetch(`/kv/_keys?pattern=${encodeURIComponent(pattern)}`, {
      headers: { 'x-app-token': token }
    })
  }

  // 设备信息 API
  async getDeviceInfo(deviceUuid) {
    return this.fetch(`/devices/${deviceUuid}`)
  }

  // 获取设备应用列表 API (公开接口，无需认证)
  async getDeviceApps(deviceUuid) {
    return this.fetch(`/apps/devices/${deviceUuid}/apps`)
  }

  // 密码提示管理 API
  async getPasswordHint(deviceUuid) {
    try {
      const response = await this.fetch(`/devices/${deviceUuid}`)
      return { hint: response.device?.passwordHint || '' }
    } catch (error) {
      // 如果接口不存在，返回空提示
      return { hint: '' }
    }
  }

  async setPasswordHint(deviceUuid, hint, password) {
    try {
      return await this.fetch(`/devices/${deviceUuid}/password-hint?password=${encodeURIComponent(password)}`, {
        method: 'PUT',
        headers: {
          'x-device-uuid': deviceUuid,
        },
        body: JSON.stringify({ passwordHint: hint }),
      })
    } catch (error) {
      // 如果接口不存在，忽略错误
      console.log('Password hint API not available')
      return { success: false }
    }
  }

  // 账户相关 API
  async getOAuthProviders() {
    return this.fetch('/accounts/oauth/providers')
  }

  async getAccountProfile(token) {
    return this.fetch('/accounts/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }

  async getAccountDevices(token) {
    return this.fetch('/accounts/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }

  async bindDevice(token, deviceUuid) {
    return this.fetch('/accounts/devices/bind', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ uuid: deviceUuid }),
    })
  }

  async unbindDevice(token, deviceUuid) {
    return this.fetch('/accounts/devices/unbind', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ uuid: deviceUuid }),
    })
  }

  async getDeviceAccount(deviceUuid) {
    return this.fetch(`/accounts/device/${deviceUuid}/account`)
  }

  // 绑定设备到当前账户
  async bindDeviceToAccount(token, deviceUuid) {
    return this.authenticatedFetch('/accounts/devices/bind', {
      method: 'POST',
      body: JSON.stringify({ uuid: deviceUuid }),
    }, token)
  }

  // 解绑设备
  async unbindDeviceFromAccount(token, deviceUuid) {
    return this.authenticatedFetch('/accounts/devices/unbind', {
      method: 'POST',
      body: JSON.stringify({ uuid: deviceUuid }),
    }, token)
  }

  // 批量解绑设备
  async batchUnbindDevices(token, deviceUuids) {
    return this.authenticatedFetch('/accounts/devices/unbind', {
      method: 'POST',
      body: JSON.stringify({ uuids: deviceUuids }),
    }, token)
  }

  // 设备名称管理 API
  async setDeviceName(deviceUuid, name, password = null, token = null) {
    const headers = {
      'x-device-uuid': deviceUuid,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (password) {
      headers['x-device-password'] = password;
    }

    return this.fetch(`/devices/${deviceUuid}/name`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name }),
    });
  }

  // 修改设备密码 API
  async updateDevicePassword(deviceUuid, currentPassword, newPassword, passwordHint = null, token = null) {
    const headers = {
      'x-device-uuid': deviceUuid,
    };

    // 如果提供了账户token，使用JWT认证（账户拥有者无需当前密码）
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (currentPassword) {
      headers['x-device-password'] = currentPassword;
    }

    const body = { newPassword, passwordHint };
    // 只有在非账户拥有者时才需要发送当前密码
    if (!token && currentPassword) {
      body.currentPassword = currentPassword;
    }

    return this.fetch(`/devices/${deviceUuid}/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  }

  // 验证设备密码 API
  async verifyDevicePassword(deviceUuid, password) {
    return this.fetch(`/devices/${deviceUuid}`, {
      method: 'GET',
      headers: {
        'x-device-uuid': deviceUuid,
        'x-device-password': password,
      },
    });
  }

  // 设备注册 API
  async registerDevice(uuid, deviceName, token = null) {
    return this.authenticatedFetch('/devices', {
      method: 'POST',
      body: JSON.stringify({ uuid, deviceName }),
    }, token)
  }

  // 账户拥有者重置设备密码 API
  async resetDevicePasswordAsOwner(deviceUuid, newPassword, passwordHint = null, token) {
    return this.fetch(`/devices/${deviceUuid}/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-device-uuid': deviceUuid,
      },
      body: JSON.stringify({ newPassword, passwordHint }),
    });
  }

  // 兼容性方法 - 保持旧的API调用方式
  async getTokens(deviceUuid, options = {}) {
    return this.getDeviceTokens(deviceUuid, options);
  }

  async deleteToken(targetToken, deviceUuid = null) {
    // 向后兼容的删除方法
    return this.revokeToken(targetToken, { deviceUuid, usePathParam: true });
  }

  // 便捷方法：使用设备UUID和密码删除token
  async revokeTokenByDevice(targetToken, deviceUuid, password = null) {
    return this.revokeToken(targetToken, {
      deviceUuid,
      password,
      usePathParam: true
    });
  }

  // 便捷方法：使用账户token删除token
  async revokeTokenByAccount(targetToken, bearerToken) {
    return this.revokeToken(targetToken, {
      bearerToken,
      usePathParam: true
    });
  }

  // 便捷方法：应用自撤销
  async revokeOwnToken(targetToken) {
    return this.fetch(`/apps/tokens/${targetToken}`, {
      method: 'DELETE',
      headers: {
        'x-app-token': targetToken,
      },
    });
  }

  // 新的便捷方法
  async getTokensWithAuth(authType, authValue, options = {}) {
    const headers = {};
    const params = new URLSearchParams(options);

    switch (authType) {
      case 'uuid':
        headers['x-device-uuid'] = authValue;
        params.set('uuid', authValue);
        break;
      case 'token':
        headers['x-app-token'] = authValue;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${authValue}`;
        break;
    }

    return this.fetch(`/apps/tokens?${params}`, { headers });
  }

  async revokeTokenWithAuth(targetToken, authType, authValue) {
    const headers = {};
    const params = new URLSearchParams({ token: targetToken });

    switch (authType) {
      case 'uuid':
        headers['x-device-uuid'] = authValue;
        break;
      case 'token':
        headers['x-app-token'] = authValue;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${authValue}`;
        break;
    }

    return this.fetch(`/apps/tokens?${params}`, {
      method: 'DELETE',
      headers,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL, SITE_KEY)
