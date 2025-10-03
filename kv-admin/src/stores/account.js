import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/lib/api'

export const useAccountStore = defineStore('account', () => {
  // 状态
  const token = ref(localStorage.getItem('auth_token') || null)
  const profile = ref(null)
  const devices = ref([])
  const loading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => profile.value?.name || '')
  const userAvatar = computed(() => profile.value?.avatarUrl || '')

  // 方法
  const setToken = (newToken) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
    } else {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_provider')
    }
  }

  const loadProfile = async () => {
    if (!token.value) return

    loading.value = true
    try {
      const response = await apiClient.getAccountProfile(token.value)
      profile.value = response.data
    } catch (error) {
      console.error('Failed to load profile:', error)
      // Token可能无效，清除
      if (error.message.includes('401')) {
        logout()
      }
    } finally {
      loading.value = false
    }
  }

  const loadDevices = async () => {
    if (!token.value) return

    try {
      const response = await apiClient.getAccountDevices(token.value)
      devices.value = response.data || []
      return devices.value
    } catch (error) {
      console.error('Failed to load devices:', error)
      return []
    }
  }

  const bindDevice = async (deviceUuid) => {
    if (!token.value) throw new Error('未登录')

    const response = await apiClient.bindDevice(token.value, deviceUuid)
    // 重新加载设备列表
    await loadDevices()
    return response
  }

  const unbindDevice = async (deviceUuid) => {
    if (!token.value) throw new Error('未登录')

    const response = await apiClient.unbindDevice(token.value, deviceUuid)
    // 重新加载设备列表
    await loadDevices()
    return response
  }

  const login = async (authToken) => {
    setToken(authToken)
    await loadProfile()
    await loadDevices()
  }

  const logout = () => {
    token.value = null
    profile.value = null
    devices.value = []
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_provider')
  }

  // 初始化时加载用户信息
  if (token.value) {
    loadProfile()
    loadDevices()
  }

  return {
    // 状态
    token,
    profile,
    devices,
    loading,
    // 计算属性
    isAuthenticated,
    userName,
    userAvatar,
    // 方法
    setToken,
    loadProfile,
    loadDevices,
    bindDevice,
    unbindDevice,
    login,
    logout,
  }
})