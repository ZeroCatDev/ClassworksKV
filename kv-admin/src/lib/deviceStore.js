// 生成 UUID v4
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 设备 UUID 管理
export const deviceStore = {
  // 获取当前设备 UUID
  getDeviceUuid() {
    return localStorage.getItem('device_uuid')
  },

  // 设置设备 UUID
  setDeviceUuid(uuid) {
    localStorage.setItem('device_uuid', uuid)
  },

  // 生成并保存新的设备 UUID
  generateAndSave() {
    const uuid = generateUUID()
    this.setDeviceUuid(uuid)
    return uuid
  },

  // 获取或生成设备 UUID
  getOrGenerate() {
    let uuid = this.getDeviceUuid()
    if (!uuid) {
      uuid = this.generateAndSave()
    }
    return uuid
  },

  // 清除设备 UUID
  clear() {
    localStorage.removeItem('device_uuid')
    localStorage.removeItem('device_password')
  },

  // 设备密码管理
  hasPassword() {
    return localStorage.getItem('device_password') === 'true'
  },

  setHasPassword(hasPassword) {
    if (hasPassword) {
      localStorage.setItem('device_password', 'true')
    } else {
      localStorage.removeItem('device_password')
    }
  }
}
