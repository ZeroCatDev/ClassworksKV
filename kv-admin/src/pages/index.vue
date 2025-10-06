<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/lib/api'
import { deviceStore } from '@/lib/deviceStore'
import { useAccountStore } from '@/stores/account'
import { useOAuthCallback } from '@/composables/useOAuthCallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Key, Shield, RefreshCw, Copy, CheckCircle2, Settings, Package, Clock, AlertCircle, Lock, Info, User, LogOut, Layers, ChevronDown } from 'lucide-vue-next'
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownItem from '@/components/ui/dropdown-menu/DropdownItem.vue'
import AppCard from '@/components/AppCard.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import LoginDialog from '@/components/LoginDialog.vue'
import DeviceRegisterDialog from '@/components/DeviceRegisterDialog.vue'
import EditDeviceNameDialog from '@/components/EditDeviceNameDialog.vue'
import { toast } from 'vue-sonner'

const deviceUuid = ref('')
const tokens = ref([])
const isLoading = ref(false)
const copied = ref(null)
const deviceInfo = ref(null) // 存储设备信息
const deviceAccount = ref(null) // 设备账户信息
const accountStore = useAccountStore()
const appInfoCache = ref({}) // 缓存应用信息

// Dialogs
const showAuthorizeDialog = ref(false)
const showRevokeDialog = ref(false)
const showRegisterDialog = ref(false)
const showPasswordDialog = ref(false)
const showLoginDialog = ref(false)
const showEditNameDialog = ref(false)
const showUserMenu = ref(false)
const deviceRequired = ref(false) // 标记是否必须注册设备
const selectedToken = ref(null)

// Form data
const appIdToAuthorize = ref('')
const authPassword = ref('')
const authNote = ref('')
const devicePassword = ref('')
const newPassword = ref('')
const currentPassword = ref('')
const passwordHint = ref('')
const revokePassword = ref('') // 撤销授权时的密码

// 使用OAuth回调处理
const { handleOAuthCallback } = useOAuthCallback()

// 使用计算属性来获取是否有密码
const hasPassword = computed(() => deviceInfo.value?.hasPassword || false)

//  Group tokens by appId
const groupedByApp = computed(() => {
  const groups = {}
  tokens.value.forEach(token => {
    const appId = token.appId
    if (!groups[appId]) {
      groups[appId] = {
        appId: appId,
        tokens: []
      }
    }
    groups[appId].tokens.push(token)
  })
  return Object.values(groups)
})

// 加载设备信息
const loadDeviceInfo = async () => {
  try {
    const info = await apiClient.getDeviceInfo(deviceUuid.value)
    deviceInfo.value = info
    // 如果有密码提示，设置它
    if (info.passwordHint) {
      passwordHint.value = info.passwordHint
    }
  } catch (error) {
    console.log('Failed to load device info:', error)
    // 设备不存在时，deviceInfo为null，hasPassword会返回false
    deviceInfo.value = null
  }
}

// 加载密码提示
const loadPasswordHint = async () => {
  try {
    const data = await apiClient.getPasswordHint(deviceUuid.value)
    if (data.hint) {
      passwordHint.value = data.hint
    }
  } catch (error) {
    console.log('Failed to load password hint')
  }
}

const loadTokens = async () => {
  if (!deviceUuid.value) return

  isLoading.value = true
  try {
    const response = await apiClient.getDeviceTokens(deviceUuid.value)
    tokens.value = response.tokens || []

    // 预加载应用信息
    for (const token of tokens.value) {
      if (!appInfoCache.value[token.appId]) {
        try {
          const appResponse = await fetch(`https://zerocat-api.houlangs.com/oauth/applications/${token.appId}`)
          if (appResponse.ok) {
            appInfoCache.value[token.appId] = await appResponse.json()
          }
        } catch (err) {
          console.error(`Failed to load app info for ${token.appId}:`, err)
        }
      }
    }
  } catch (error) {
    console.error('Failed to load tokens:', error)
    if (error.message.includes('设备不存在')) {
      tokens.value = []
    }
  } finally {
    isLoading.value = false
  }
}

// 获取应用名称的辅助函数
const getAppName = (appId) => {
  return appInfoCache.value[appId]?.name || `应用 ${appId}`
}

const authorizeApp = async () => {
  if (!appIdToAuthorize.value) return

  try {
    const options = {
      note: authNote.value || '授权访问',
    }

    if (hasPassword.value && authPassword.value) {
      options.password = authPassword.value
    }

    if (accountStore.isAuthenticated) {
      options.token = accountStore.token
    }

    // 调用授权接口
    await apiClient.authorizeApp(
      appIdToAuthorize.value,
      deviceUuid.value,
      options
    )

    showAuthorizeDialog.value = false
    appIdToAuthorize.value = ''
    authPassword.value = ''
    authNote.value = ''

    await loadTokens()
    toast.success('授权成功')
  } catch (error) {
    toast.error('授权失败：' + error.message)
  }
}

const confirmRevoke = (token) => {
  selectedToken.value = token
  showRevokeDialog.value = true
}

const revokeToken = async () => {
  if (!selectedToken.value) return

  // 如果没有登录账户且设备有密码，检查是否输入了密码
  if (!accountStore.isAuthenticated && hasPassword.value && !revokePassword.value) {
    alert('请输入设备密码')
    return
  }

  try {
    // 使用安装记录ID撤销授权
    await apiClient.revokeDeviceToken(
      deviceUuid.value,
      selectedToken.value.id,
      accountStore.isAuthenticated ? null : revokePassword.value,
      accountStore.isAuthenticated ? accountStore.token : null
    )
    showRevokeDialog.value = false
    selectedToken.value = null
    revokePassword.value = ''
    await loadTokens()
    toast.success('撤销成功')
  } catch (error) {
    toast.error('撤销失败：' + error.message)
  }
}

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    setTimeout(() => {
      copied.value = null
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const updateUuid = () => {
  showRegisterDialog.value = false
  deviceUuid.value = deviceStore.getDeviceUuid()
  loadDeviceInfo()
  loadDeviceAccount()
  loadTokens()
}

const setPassword = async () => {
  if (!newPassword.value) return

  try {
    const data = {
      newPassword: newPassword.value,
    }

    if (hasPassword.value && !accountStore.isAuthenticated) {
      data.currentPassword = currentPassword.value
    }

    await apiClient.setDevicePassword(
      deviceUuid.value,
      data,
      accountStore.isAuthenticated ? accountStore.token : null
    )

    // 重新加载设备信息以更新hasPassword状态
    await loadDeviceInfo()

    showPasswordDialog.value = false
    newPassword.value = ''
    currentPassword.value = ''
    toast.success('密码设置成功')
  } catch (error) {
    toast.error('设置密码失败：' + error.message)
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 加载设备账户信息
const loadDeviceAccount = async () => {
  if (!deviceUuid.value) return

  try {
    const response = await apiClient.getDeviceAccount(deviceUuid.value)
    deviceAccount.value = response.data
  } catch (error) {
    console.log('Failed to load device account:', error)
    deviceAccount.value = null
  }
}

// 登录成功回调
const handleLoginSuccess = async (token) => {
  showLoginDialog.value = false
  await accountStore.login(token)
  await loadDeviceAccount()

  // 如果当前设备未绑定，提示是否绑定
  if (!deviceAccount.value) {
    toast('登录成功', {
      description: '您可以将当前设备绑定到账户'
    })
  }

  // 登录完成后，根据需要决定是否继续显示设备弹框

  // 如果设备已经注册，即使是必需模式也不再显示设备弹框
  if (deviceUuid.value) {
    deviceRequired.value = false
  } else if (deviceRequired.value) {
    // 如果仍然需要设备，再次显示设备管理弹框
    showRegisterDialog.value = true
  }
}

// 退出登录
const handleLogout = () => {
  accountStore.logout()
  deviceAccount.value = null
  toast('已退出登录')
}

// 绑定当前设备到账户
const bindCurrentDevice = async () => {
  if (!accountStore.isAuthenticated) {
    toast.error('请先登录')
    showLoginDialog.value = true
    return
  }

  try {
    await apiClient.bindDeviceToAccount(accountStore.token, deviceUuid.value)
    await loadDeviceInfo()
    toast.success('设备已绑定到您的账户')
  } catch (error) {
    // 如果设备不存在，先注册再绑定
    if (error.message.includes('设备不存在')) {
      try {
        await apiClient.registerDevice(
          deviceUuid.value,
          deviceInfo.value?.deviceName || null,
          accountStore.token
        )
        await apiClient.bindDeviceToAccount(accountStore.token, deviceUuid.value)
        await loadDeviceInfo()
        toast.success('设备已注册并绑定到您的账户')
      } catch (retryError) {
        toast.error('绑定失败：' + retryError.message)
      }
    } else {
      toast.error('绑定失败：' + error.message)
    }
  }
}

// 解绑当前设备
const unbindCurrentDevice = async () => {
  if (!accountStore.isAuthenticated) {
    toast.error('请先登录')
    return
  }

  try {
    await apiClient.unbindDeviceFromAccount(accountStore.token, deviceUuid.value)
    await loadDeviceInfo()
    toast.success('设备已解绑')
  } catch (error) {
    toast.error('解绑失败：' + error.message)
  }
}

// 更新设备名称成功回调
const handleDeviceNameUpdated = async (newName) => {
  await loadDeviceInfo()
}

onMounted(async () => {
  // 检查是否存在设备UUID
  const existingUuid = deviceStore.getDeviceUuid()
  if (!existingUuid) {
    deviceRequired.value = true
    // 如果没有设备UUID，显示设备管理弹框
    showRegisterDialog.value = true
  } else {
    deviceUuid.value = existingUuid

    // 先加载设备信息
    await loadDeviceInfo()

    // 加载设备账户信息
    await loadDeviceAccount()

    // 如果有密码但密码提示不存在，单独加载密码提示
    if (hasPassword.value && !passwordHint.value) {
      await loadPasswordHint()
    }

    // 加载tokens
    await loadTokens()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-2.5 shadow-lg">
              <Shield class="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Classworks KV
              </h1>
              <p class="text-sm text-muted-foreground">云原生键值数据库</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 账户状态 -->
            <template v-if="accountStore.isAuthenticated">
              <DropdownMenu v-model:open="showUserMenu" class="z-50">
                <template #trigger="{ toggle, open }">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="flex items-center gap-2"
                    @click="toggle"
                  >
                    <img
                      v-if="accountStore.userAvatar"
                      :src="accountStore.userAvatar"
                      :alt="accountStore.userName"
                      class="w-5 h-5 rounded-full"
                    >
                    <User v-else class="h-4 w-4" />
                    <span class="hidden sm:inline">{{ accountStore.userName }}</span>
                    <ChevronDown class="h-3.5 w-3.5" :class="{ 'rotate-180': open }" />
                  </Button>
                </template>

                <DropdownItem @click="$router.push('/device-management')">
                  <Layers class="h-4 w-4" />
                  设备管理
                </DropdownItem>
                <DropdownItem @click="$router.push('/password-manager')">
                  <Settings class="h-4 w-4" />
                  高级设置
                </DropdownItem>
                <DropdownItem @click="handleLogout" class="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                  <LogOut class="h-4 w-4" />
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </template>
            <Button
              v-else
              variant="outline"
              size="sm"
              @click="showLoginDialog = true"
            >
              <User class="h-4 w-4 mr-2" />
              登录
            </Button>


            <Button
              variant="outline"
              size="icon"
              @click="loadTokens"
              :disabled="isLoading"
            >
              <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-7xl">
      <!-- Device Info Card -->
      <Card class="mb-8 border-2 shadow-xl bg-gradient-to-br from-card to-card/95">
        <CardHeader class="pb-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <Key class="h-5 w-5 text-primary" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <CardTitle class="text-lg">
                    {{ deviceInfo?.name || '设备标识' }}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6"
                    @click="showEditNameDialog = true"
                    title="编辑设备名称"
                  >
                    <Settings class="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>您的唯一设备标识符</CardDescription>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge
                variant="outline"
                class="px-3 py-1"
                :class="hasPassword ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-yellow-500 text-yellow-700 dark:text-yellow-400'"
              >
                <Lock v-if="hasPassword" class="h-3 w-3 mr-1.5" />
                <AlertCircle v-else class="h-3 w-3 mr-1.5" />
                {{ hasPassword ? '已设密码保护' : '未设密码' }}
              </Badge>

              <!-- 设备账户绑定状态 -->
              <Badge v-if="deviceInfo?.account" variant="secondary" class="px-3 py-1">
                <User class="h-3 w-3 mr-1.5" />
                {{ deviceInfo.account.name }}
              </Badge>
              <Button
                v-else-if="accountStore.isAuthenticated"
                variant="outline"
                size="sm"
                @click="bindCurrentDevice"
              >
                <User class="h-4 w-4 mr-2" />
                绑定到账户
              </Button><Button
              @click="$router.push('/password-manager')"
                variant="outline"
                size="sm"
              ><Settings class="h-4 w-4" />
                  高级设置</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- UUID Display -->
            <div class="relative group">
              <div class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
              <div class="relative flex items-center gap-2 p-4 bg-gradient-to-r from-muted/80 to-muted/60 rounded-lg border">
                <code class="flex-1 text-sm font-mono tracking-wider select-all">
                  {{ deviceUuid }}
                </code>
                <div class="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    @click="copyToClipboard(deviceUuid, 'uuid')"
                    title="复制设备标识"
                  >
                    <CheckCircle2 v-if="copied === 'uuid'" class="h-4 w-4 text-green-500 animate-in zoom-in-50" />
                    <Copy v-else class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <div class="text-2xl font-bold text-primary">{{ groupedByApp.length }}</div>
                <div class="text-xs text-muted-foreground">应用数</div>
              </div>
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <div class="text-2xl font-bold text-primary">{{ tokens.length }}</div>
                <div class="text-xs text-muted-foreground">令牌数</div>
              </div>
              <div class="p-3 rounded-lg bg-muted/50 text-center">
                <div class="text-2xl font-bold text-primary">
                  {{ hasPassword ? '安全' : '未设置' }}
                </div>
                <div class="text-xs text-muted-foreground">安全状态</div>
              </div>
            </div>

            <!-- Password Hint (if exists) -->
            <div v-if="hasPassword && passwordHint" class="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div class="flex items-start gap-2">
                <Info class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">密码提示</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">{{ passwordHint }}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">已授权应用</h2>
        <Button @click="showAuthorizeDialog = true" class="gap-2">
          <Plus class="h-4 w-4" />
          授权新应用
        </Button>
      </div>


      <div v-if="isLoading" class="text-center py-12">
        <RefreshCw class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">加载中...</p>
      </div>


      <Card v-else-if="groupedByApp.length === 0" class="border-dashed">
        <CardContent class="flex flex-col items-center justify-center py-12">
          <Package class="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">暂无授权应用</p>
          <p class="text-sm text-muted-foreground mb-4">点击上方按钮授权您的第一个应用</p>
          <Button @click="showAuthorizeDialog = true" variant="outline">
            <Plus class="h-4 w-4 mr-2" />
            授权应用
          </Button>
        </CardContent>
      </Card>


      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="app in groupedByApp"
          :key="app.appId"
          class="space-y-4"
        >
          <AppCard :app-id="app.appId" />
          <Card class="border-dashed">
            <CardContent class="p-4 space-y-3">
              <div
                v-for="(token, index) in app.tokens"
                :key="token.token"
                class="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <Key class="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <code class="text-xs font-mono flex-1 truncate">
                      {{ token.token }}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 w-7 p-0"
                      @click="copyToClipboard(token.token, token.token)"
                    >
                      <CheckCircle2 v-if="copied === token.token" class="h-3 w-3 text-green-500" />
                      <Copy v-else class="h-3 w-3" />
                    </Button>
                  </div>

                  <div v-if="token.note" class="text-xs text-muted-foreground pl-5">
                    {{ token.note }}
                  </div>

                  <div class="flex items-center justify-between pl-5">
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock class="h-3 w-3" />
                      {{ formatDate(token.installedAt) }}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      @click="confirmRevoke(token)"
                    >
                      <Trash2 class="h-3 w-3 mr-1" />
                      撤销
                    </Button>
                  </div>
                </div>

                <div
                  v-if="index < app.tokens.length - 1"
                  class="mt-3 border-t border-border/50"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      <Dialog v-model:open="showAuthorizeDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>授权新应用</DialogTitle>
            <DialogDescription>
              为应用生成新的访问令牌
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="appId">应用 ID</Label>
              <Input
                id="appId"
                v-model="appIdToAuthorize"
                placeholder="输入应用 ID"
              />
            </div>
            <div class="space-y-2">
              <Label for="note">备注（可选）</Label>
              <Input
                id="note"
                v-model="authNote"
                placeholder="为此授权添加备注"
              />
            </div>
            <div v-if="hasPassword">
              <PasswordInput
                v-model="authPassword"
                label="设备密码"
                placeholder="输入设备密码"
                :device-uuid="deviceUuid"
                :show-hint="true"
                :show-strength="false"
                :required="!accountStore.isAuthenticated"
              />
              <p v-if="accountStore.isAuthenticated" class="text-xs text-muted-foreground mt-2">
                已登录绑定账户，无需输入密码
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showAuthorizeDialog = false">
              取消
            </Button>
            <Button @click="authorizeApp">
              授权
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog v-model:open="showRevokeDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销授权</DialogTitle>
            <DialogDescription>
              确定要撤销此令牌的授权吗？此操作无法撤销。{{selectedToken}}
            </DialogDescription>
          </DialogHeader>
          <div v-if="selectedToken" class="py-4 space-y-4">
            <div class="p-4 bg-muted rounded-lg space-y-2">
              <div class="text-sm">
                <span class="font-medium">应用: </span>
                {{ getAppName(selectedToken.appId) }}
              </div>
              <div class="text-sm">
                <span class="font-medium">令牌: </span>
                <code class="text-xs">{{ selectedToken.token.slice(0, 16) }}...</code>
              </div>
            </div>

            <!-- 如果没有登录账户且设备有密码，显示密码输入框 -->
            <div v-if="!accountStore.isAuthenticated && hasPassword" class="space-y-2">
              <Label for="revoke-password">设备密码</Label>
              <PasswordInput
                id="revoke-password"
                v-model="revokePassword"
                placeholder="请输入设备密码"
                required
              />
            </div>

            <!-- 显示当前认证状态 -->
            <div class="text-sm text-muted-foreground">
              <div v-if="accountStore.isAuthenticated" class="flex items-center gap-2 text-green-600">
                <CheckCircle2 class="h-4 w-4" />
                已登录账户，无需输入密码
              </div>
              <div v-else-if="!hasPassword" class="flex items-center gap-2 text-blue-600">
                <Info class="h-4 w-4" />
                设备未设置密码
              </div>
              <div v-else class="flex items-center gap-2 text-orange-600">
                <Lock class="h-4 w-4" />
                需要验证设备密码
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showRevokeDialog = false">
              取消
            </Button>
            <Button variant="destructive" @click="revokeToken">
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog v-model:open="showPasswordDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ hasPassword ? '修改密码' : '设置密码' }}</DialogTitle>
            <DialogDescription>
              {{ hasPassword ? '输入当前密码和新密码' : '为设备设置密码以增强安全性' }}
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div v-if="hasPassword && !accountStore.isAuthenticated">
              <PasswordInput
                v-model="currentPassword"
                label="当前密码"
                placeholder="输入当前密码"
                :device-uuid="deviceUuid"
                :show-hint="true"
                :show-strength="false"
                required
              />
            </div>
            <div v-if="accountStore.isAuthenticated && hasPassword" class="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div class="flex items-start gap-2">
                <Info class="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-100">账户已登录</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">您已登录绑定的账户，无需输入当前密码</p>
                </div>
              </div>
            </div>
            <div>
              <PasswordInput
                v-model="newPassword"
                label="新密码"
                placeholder="输入新密码"
                :show-hint="false"
                :show-strength="true"
                :min-length="8"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showPasswordDialog = false">
              取消
            </Button>
            <Button @click="setPassword">
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- 登录弹框 -->
    <LoginDialog
      v-model="showLoginDialog"
      :on-success="handleLoginSuccess"
      @update:modelValue="val => {
        if (!val && deviceRequired.value) {
          showRegisterDialog.value = true
        }
      }"
    />    <!-- 设备注册弹框 -->
    <DeviceRegisterDialog
      v-model="showRegisterDialog"
      @confirm="updateUuid"
      :required="deviceRequired"
    />

    <!-- 设备名称编辑弹框 -->
    <EditDeviceNameDialog
      v-model="showEditNameDialog"
      :device-uuid="deviceUuid"
      :current-name="deviceInfo?.deviceName || ''"
      :has-password="hasPassword"
      @success="handleDeviceNameUpdated"
    />
  </div>
</template>