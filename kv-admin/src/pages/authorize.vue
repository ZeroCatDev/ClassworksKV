<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/lib/api'
import { deviceStore } from '@/lib/deviceStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Shield, Key, AlertCircle } from 'lucide-vue-next'
import AppCard from '@/components/AppCard.vue'

const route = useRoute()
const router = useRouter()

// URL 参数
const appId = ref(route.query.app_id || '')
const mode = ref(route.query.mode || 'callback') // 'callback' | 'devicecode'
const deviceCode = ref(route.query.devicecode || '')
const callbackUrl = ref(route.query.callback_url || '')

// 状态
const step = ref('input') // 'input' | 'loading' | 'success' | 'error'
const errorMessage = ref('')
const deviceUuid = ref('')
const hasPassword = ref(false)

// 表单数据
const inputDeviceCode = ref('')
const authPassword = ref('')
const authNote = ref('')

// 应用信息
const appInfo = ref(null)

// 计算属性
const isDeviceCodeMode = computed(() => mode.value === 'devicecode')
const currentDeviceCode = computed(() => deviceCode.value || inputDeviceCode.value)

// 加载应用信息
const loadAppInfo = async () => {
  if (!appId.value) return

  try {
    const data = await apiClient.getApp(appId.value)
    appInfo.value = data
  } catch (error) {
    console.error('Failed to load app info:', error)
  }
}

// 授权应用并绑定到设备代码
const authorizeWithDeviceCode = async () => {
  if (!currentDeviceCode.value || !deviceUuid.value) return

  step.value = 'loading'
  errorMessage.value = ''

  try {
    // 1. 授权应用并获取 token
    const authData = {
      deviceUuid: deviceUuid.value,
      note: authNote.value || '设备代码授权',
    }

    if (hasPassword.value && authPassword.value) {
      authData.password = authPassword.value
    }

    const authResult = await apiClient.authorizeApp(appId.value, authData)
    const token = authResult.token

    // 2. 绑定 token 到设备代码
    await apiClient.bindDeviceCode(currentDeviceCode.value, token)

    step.value = 'success'
  } catch (error) {
    step.value = 'error'
    errorMessage.value = error.message || '授权失败'
  }
}

// 授权应用并回调
const authorizeWithCallback = async () => {
  if (!deviceUuid.value) return

  step.value = 'loading'
  errorMessage.value = ''

  try {
    const authData = {
      deviceUuid: deviceUuid.value,
      note: authNote.value || '回调授权',
    }

    if (hasPassword.value && authPassword.value) {
      authData.password = authPassword.value
    }

    const authResult = await apiClient.authorizeApp(appId.value, authData)
    const token = authResult.token

    // 如果有回调 URL，跳转并携带 token
    if (callbackUrl.value) {
      const url = new URL(callbackUrl.value)
      url.searchParams.set('token', token)
      window.location.href = url.toString()
    } else {
      step.value = 'success'
    }
  } catch (error) {
    step.value = 'error'
    errorMessage.value = error.message || '授权失败'
  }
}

// 提交授权
const handleSubmit = async () => {
  if (isDeviceCodeMode.value) {
    await authorizeWithDeviceCode()
  } else {
    await authorizeWithCallback()
  }
}

// 返回首页
const goHome = () => {
  router.push('/')
}

// 重试
const retry = () => {
  step.value = 'input'
  errorMessage.value = ''
  authPassword.value = ''
}

onMounted(() => {
  deviceUuid.value = deviceStore.getOrGenerate()
  hasPassword.value = deviceStore.hasPassword()
  loadAppInfo()

  // 如果是 devicecode 模式且已有设备代码，自动填充
  if (isDeviceCodeMode.value && deviceCode.value) {
    inputDeviceCode.value = deviceCode.value
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <Card class="w-full max-w-md">
      <!-- 头部 -->
      <CardHeader class="space-y-4">
        <div class="flex items-center justify-center">
          <div class="rounded-full bg-primary/10 p-3">
            <Key class="h-8 w-8 text-primary" />
          </div>
        </div>
        <div class="space-y-2 text-center">
          <CardTitle class="text-2xl">应用授权</CardTitle>
          <CardDescription>
            <template v-if="appInfo">
              授权 <span class="font-semibold">{{ appInfo.name }}</span> 访问您的 KV 存储
            </template>
            <template v-else>
              授权应用访问您的 KV 存储
            </template>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent class="space-y-6">
        <!-- 应用信息 -->
        <div v-if="appInfo">
          <AppCard :app-id="parseInt(appId)" class="mb-4" />
        </div>

        <!-- 设备信息 -->
        <div class="space-y-3">
          <Label class="text-sm text-muted-foreground">设备 UUID</Label>
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono bg-muted px-3 py-2 rounded flex-1 truncate">
              {{ deviceUuid }}
            </code>
            <Badge v-if="hasPassword" variant="secondary" class="shrink-0">
              <Shield class="h-3 w-3 mr-1" />
              已保护
            </Badge>
          </div>
        </div>

        <!-- 模式标识 -->
        <div class="flex items-center gap-2">
          <Badge :variant="isDeviceCodeMode ? 'default' : 'secondary'">
            {{ isDeviceCodeMode ? '设备代码模式' : '回调模式' }}
          </Badge>
        </div>

        <!-- 输入表单状态 -->
        <div v-if="step === 'input'" class="space-y-4">
          <!-- 设备代码输入（仅设备代码模式且无预填充时显示） -->
          <div v-if="isDeviceCodeMode && !deviceCode" class="space-y-2">
            <Label for="device-code">设备代码</Label>
            <Input
              id="device-code"
              v-model="inputDeviceCode"
              placeholder="例如：1234-ABCD"
              class="font-mono"
            />
          </div>

          <!-- 设备代码显示（已预填充） -->
          <div v-else-if="isDeviceCodeMode && deviceCode" class="space-y-2">
            <Label class="text-sm text-muted-foreground">设备代码</Label>
            <div class="rounded-lg bg-primary/5 border-2 border-primary/20 p-6">
              <div class="text-center font-mono text-2xl font-bold tracking-wider text-primary">
                {{ deviceCode }}
              </div>
            </div>
          </div>

          <!-- 备注 -->
          <div class="space-y-2">
            <Label for="note">备注（可选）</Label>
            <Input
              id="note"
              v-model="authNote"
              placeholder="例如：CLI 工具访问"
            />
          </div>

          <!-- 密码输入 -->
          <div v-if="hasPassword" class="space-y-2">
            <Label for="password">设备密码</Label>
            <Input
              id="password"
              v-model="authPassword"
              type="text"
              placeholder="输入设备密码以确认授权"
            />
          </div>

          <!-- 授权按钮 -->
          <div class="space-y-3 pt-2">
            <Button
              @click="handleSubmit"
              class="w-full"
              size="lg"
              :disabled="(isDeviceCodeMode && !currentDeviceCode) || (hasPassword && !authPassword)"
            >
              <Key class="mr-2 h-4 w-4" />
              确认授权
            </Button>

            <!-- 返回首页 -->
            <Button @click="goHome" variant="ghost" class="w-full">
              返回管理页面
            </Button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-else-if="step === 'loading'" class="py-8">
          <div class="flex flex-col items-center justify-center space-y-4">
            <Loader2 class="h-12 w-12 animate-spin text-primary" />
            <div class="text-center space-y-1">
              <div class="font-medium">正在授权...</div>
              <div class="text-sm text-muted-foreground">请稍候</div>
            </div>
          </div>
        </div>

        <!-- 成功状态 -->
        <div v-else-if="step === 'success'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8 space-y-4">
            <div class="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
              <CheckCircle2 class="h-12 w-12 text-green-600 dark:text-green-500" />
            </div>
            <div class="text-center space-y-2">
              <div class="text-lg font-semibold">授权成功！</div>
              <div class="text-sm text-muted-foreground">
                <template v-if="isDeviceCodeMode">
                  设备代码已绑定，您可以继续使用 CLI 工具
                </template>
                <template v-else>
                  应用已成功授权
                </template>
              </div>
            </div>
          </div>

          <Button @click="goHome" class="w-full" size="lg">
            返回管理页面
          </Button>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="step === 'error'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8 space-y-4">
            <div class="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <XCircle class="h-12 w-12 text-red-600 dark:text-red-500" />
            </div>
            <div class="text-center space-y-2">
              <div class="text-lg font-semibold">授权失败</div>
              <div class="text-sm text-muted-foreground">{{ errorMessage }}</div>
            </div>
          </div>

          <div class="space-y-2">
            <Button @click="retry" class="w-full" size="lg">
              重试
            </Button>
            <Button @click="goHome" variant="ghost" class="w-full">
              返回管理页面
            </Button>
          </div>
        </div>

        <!-- 提示信息 -->
        <div v-if="step === 'input'" class="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
          <div class="flex gap-3">
            <AlertCircle class="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div class="space-y-1.5 text-sm">
              <div class="font-medium text-blue-900 dark:text-blue-100">授权说明</div>
              <div class="text-blue-700 dark:text-blue-300 leading-relaxed">
                <template v-if="isDeviceCodeMode">
                  点击"确认授权"后，应用将获得访问您 KV 存储的权限。CLI 工具将自动完成授权流程。
                </template>
                <template v-else>
                  点击"确认授权"后，应用将获得访问您 KV 存储的权限。
                </template>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
