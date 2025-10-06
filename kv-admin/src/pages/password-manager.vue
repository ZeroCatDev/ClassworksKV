<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api'
import { deviceStore } from '@/lib/deviceStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import PasswordInput from '@/components/PasswordInput.vue'
import {
  Shield,
  Key,
  Trash2,
  Edit,
  Info,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
  Smartphone
} from 'lucide-vue-next'
import DeviceRegisterDialog from '@/components/DeviceRegisterDialog.vue'

const router = useRouter()
const deviceUuid = ref('')
const deviceInfo = ref(null)

// 计算属性获取是否有密码
const hasPassword = computed(() => deviceInfo.value?.hasPassword || false)
const passwordHint = ref('')

// Dialog states
const showChangePasswordDialog = ref(false)
const showDeletePasswordDialog = ref(false)
const showHintDialog = ref(false)
const showResetDeviceDialog = ref(false)
const showRegisterDialog = ref(false)
const deviceRequired = ref(false)

// Form data
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const deleteConfirmPassword = ref('')
const newHint = ref('')
const hintPassword = ref('')

// UI states
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// 加载设备信息
const loadDeviceInfo = async () => {
  try {
    const info = await apiClient.getDeviceInfo(deviceUuid.value)
    deviceInfo.value = info
    if (info.passwordHint) {
      passwordHint.value = info.passwordHint
    }
  } catch (error) {
    console.log('Failed to load device info:', error)
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

// 修改密码
const changePassword = async () => {
  if (!newPassword.value || !currentPassword.value) {
    errorMessage.value = '请填写所有必填字段'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '新密码与确认密码不一致'
    return
  }

  if (newPassword.value === currentPassword.value) {
    errorMessage.value = '新密码不能与当前密码相同'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await apiClient.setDevicePassword(deviceUuid.value, {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    successMessage.value = '密码修改成功！'
    showChangePasswordDialog.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    errorMessage.value = error.message || '密码修改失败'
  } finally {
    isLoading.value = false
  }
}

// 删除密码
const deletePassword = async () => {
  if (!deleteConfirmPassword.value) {
    errorMessage.value = '请输入当前密码'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await apiClient.deleteDevicePassword(deviceUuid.value, deleteConfirmPassword.value)

    // 重新加载设备信息
    await loadDeviceInfo()

    successMessage.value = '密码已删除！'
    showDeletePasswordDialog.value = false
    deleteConfirmPassword.value = ''
    passwordHint.value = ''

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    errorMessage.value = error.message || '密码删除失败'
  } finally {
    isLoading.value = false
  }
}

// 设置密码提示
const setPasswordHint = async () => {
  if (!hintPassword.value) {
    errorMessage.value = '请输入当前密码'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await apiClient.setPasswordHint(deviceUuid.value, newHint.value, hintPassword.value)

    passwordHint.value = newHint.value
    successMessage.value = '密码提示已更新！'
    showHintDialog.value = false
    newHint.value = ''
    hintPassword.value = ''

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    errorMessage.value = error.message || '设置密码提示失败'
  } finally {
    isLoading.value = false
  }
}

// 设置新密码（无密码时）
const setNewPassword = async () => {
  if (!newPassword.value) {
    errorMessage.value = '请输入新密码'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '密码与确认密码不一致'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await apiClient.setDevicePassword(deviceUuid.value, {
      newPassword: newPassword.value
    })

    // 重新加载设备信息
    await loadDeviceInfo()

    successMessage.value = '密码设置成功！'
    newPassword.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    errorMessage.value = error.message || '密码设置失败'
  } finally {
    isLoading.value = false
  }
}

// 返回首页
const goBack = () => {
  router.push('/')
}

// 设备重置成功后的回调
const handleDeviceReset = () => {
  deviceUuid.value = deviceStore.getDeviceUuid()
  loadDeviceInfo()
  successMessage.value = '设备已重置！'

  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

// 更新设备UUID回调
const updateUuid = () => {
  showRegisterDialog.value = false
  deviceUuid.value = deviceStore.getDeviceUuid()
  loadDeviceInfo()
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

    // 加载设备信息
    await loadDeviceInfo()

    // 如果有密码但密码提示不存在，单独加载密码提示
    if (hasPassword.value && !passwordHint.value) {
      await loadPasswordHint()
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <!-- Header -->
    <div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Button variant="ghost" size="icon" @click="goBack">
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div>
              <h1 class="text-xl font-bold">高级设置</h1>
              <p class="text-sm text-muted-foreground">设备管理与安全设置</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-8 max-w-4xl">
      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="mb-6">
        <div class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
          <span class="text-green-800 dark:text-green-200">{{ successMessage }}</span>
        </div>
      </div>

      <div v-if="errorMessage" class="mb-6">
        <div class="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400" />
          <span class="text-red-800 dark:text-red-200">{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Password Status Card -->
      <Card class="mb-6 border-2">
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <Shield class="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>密码状态</CardTitle>
                <CardDescription>当前设备的密码保护状态</CardDescription>
              </div>
            </div>
            <Badge :variant="hasPassword ? 'default' : 'secondary'" class="text-sm">
              <Lock v-if="hasPassword" class="h-3 w-3 mr-1" />
              <Unlock v-else class="h-3 w-3 mr-1" />
              {{ hasPassword ? '已设置密码' : '未设置密码' }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- Device UUID -->
            <div class="p-4 rounded-lg bg-muted/50">
              <Label class="text-xs text-muted-foreground">设备 UUID</Label>
              <code class="block mt-1 text-sm font-mono break-all">{{ deviceUuid }}</code>
            </div>

            <!-- Password Hint -->
            <div v-if="hasPassword && passwordHint" class="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div class="flex items-start gap-2">
                <HelpCircle class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">密码提示</p>
                  <p class="text-sm text-blue-700 dark:text-blue-300">{{ passwordHint }}</p>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-3 pt-2">
              <Button
                v-if="!hasPassword"
                @click="showChangePasswordDialog = true"
                class="flex-1 sm:flex-none"
              >
                <Key class="h-4 w-4 mr-2" />
                设置密码
              </Button>

              <Button
                v-if="hasPassword"
                @click="showChangePasswordDialog = true"
                variant="outline"
                class="flex-1 sm:flex-none"
              >
                <Edit class="h-4 w-4 mr-2" />
                修改密码
              </Button>

              <Button
                v-if="hasPassword"
                @click="showHintDialog = true"
                variant="outline"
                class="flex-1 sm:flex-none"
              >
                <Info class="h-4 w-4 mr-2" />
                {{ passwordHint ? '修改提示' : '设置提示' }}
              </Button>

              <Button
                v-if="hasPassword"
                @click="showDeletePasswordDialog = true"
                variant="destructive"
                class="flex-1 sm:flex-none"
              >
                <Trash2 class="h-4 w-4 mr-2" />
                删除密码
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 设备管理部分 -->
      <h2 class="text-xl font-semibold mt-12 mb-4">设备管理</h2>

      <!-- 设备重置卡片 -->
      <Card class="mb-6 border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle class="text-lg flex items-center gap-2">
            <Smartphone class="h-5 w-5 text-red-500" />
            重置设备
          </CardTitle>
          <CardDescription>
            重置或换新设备标识。此操作无法撤销，您将失去当前设备的所有授权。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <div class="flex items-start gap-2">
                <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-red-900 dark:text-red-100">警告：此操作不可逆</p>
                  <p class="text-sm text-red-700 dark:text-red-300 mt-1">
                    重置设备后，您将获得全新的设备标识，现有的所有授权将被撤销，无法恢复。
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              class="w-full flex items-center justify-center gap-2"
              @click="showResetDeviceDialog = true"
            >
              <RefreshCw class="h-4 w-4" />
              重置设备
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>

    <!-- Change/Set Password Dialog -->
    <Dialog v-model:open="showChangePasswordDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ hasPassword ? '修改密码' : '设置密码' }}</DialogTitle>
          <DialogDescription>
            {{ hasPassword ? '请输入当前密码和新密码' : '为您的设备设置一个安全的密码' }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <!-- Current Password (only when changing) -->
          <div v-if="hasPassword">
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

          <!-- New Password -->
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

          <!-- Confirm Password -->
          <div>
            <PasswordInput
              v-model="confirmPassword"
              label="确认新密码"
              placeholder="再次输入新密码"
              :show-hint="false"
              :show-strength="false"
              :confirm-password="newPassword"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showChangePasswordDialog = false" :disabled="isLoading">
            取消
          </Button>
          <Button
            @click="hasPassword ? changePassword() : setNewPassword()"
            :disabled="isLoading || !newPassword || newPassword !== confirmPassword || (hasPassword && !currentPassword)"
          >
            {{ isLoading ? '处理中...' : (hasPassword ? '修改密码' : '设置密码') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Password Dialog -->
    <Dialog v-model:open="showDeletePasswordDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除密码</DialogTitle>
          <DialogDescription>
            删除密码后，您的设备将不再受密码保护。此操作无法撤销。
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
            <div class="flex items-start gap-2">
              <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div class="text-sm text-yellow-800 dark:text-yellow-200">
                <p class="font-medium mb-1">警告</p>
                <p>删除密码后，任何拥有您设备 UUID 的人都可以管理您的授权应用。</p>
              </div>
            </div>
          </div>

          <div>
            <PasswordInput
              v-model="deleteConfirmPassword"
              label="输入当前密码以确认"
              placeholder="输入当前密码"
              :device-uuid="deviceUuid"
              :show-hint="true"
              :show-strength="false"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDeletePasswordDialog = false" :disabled="isLoading">
            取消
          </Button>
          <Button
            variant="destructive"
            @click="deletePassword"
            :disabled="isLoading || !deleteConfirmPassword"
          >
            {{ isLoading ? '删除中...' : '确认删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Set/Update Hint Dialog -->
    <Dialog v-model:open="showHintDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ passwordHint ? '修改密码提示' : '设置密码提示' }}</DialogTitle>
          <DialogDescription>
            密码提示可以帮助您在忘记密码时回忆起密码
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div v-if="passwordHint" class="p-3 rounded-lg bg-muted">
            <Label class="text-xs text-muted-foreground">当前提示</Label>
            <p class="text-sm mt-1">{{ passwordHint }}</p>
          </div>

          <div class="space-y-2">
            <Label for="new-hint">新的密码提示</Label>
            <Input
              id="new-hint"
              v-model="newHint"
              placeholder="例如：我的宠物名字加生日"
            />
            <p class="text-xs text-muted-foreground">
              提示不应包含密码本身，而是能帮助您回忆密码的信息
            </p>
          </div>

          <div>
            <PasswordInput
              v-model="hintPassword"
              label="当前密码"
              placeholder="输入当前密码以确认"
              :device-uuid="deviceUuid"
              :show-hint="true"
              :show-strength="false"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showHintDialog = false" :disabled="isLoading">
            取消
          </Button>
          <Button
            @click="setPasswordHint"
            :disabled="isLoading || !hintPassword"
          >
            {{ isLoading ? '保存中...' : '保存提示' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 设备重置弹框 -->
    <DeviceRegisterDialog
      v-model="showResetDeviceDialog"
      @confirm="handleDeviceReset"
      @update:modelValue="val => showResetDeviceDialog = val"
    />

    <!-- 必需注册弹框 -->
    <DeviceRegisterDialog
      v-model="showRegisterDialog"
      @confirm="updateUuid"
      :required="deviceRequired"
    />
  </div>
</template>