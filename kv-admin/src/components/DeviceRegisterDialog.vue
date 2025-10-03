<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { deviceStore, generateUUID } from '@/lib/deviceStore'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import LoginDialog from '@/components/LoginDialog.vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Shuffle, Download, Plus, AlertTriangle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'openLogin'])

const accountStore = useAccountStore()

const newUuid = ref('')
const deviceName = ref('')
const bindToAccount = ref(false)
const accountDevices = ref([])
const loadingDevices = ref(false)
const activeTab = ref('load') // 'load' 或 'register'
const showLoginDialog = ref(false) // 登录对话框状态

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 监听对话框打开，自动加载账户设备（如果已登录）
watch(isOpen, (newVal) => {
  if (newVal && accountStore.isAuthenticated && activeTab.value === 'load') {
    loadAccountDevices()
  }
  // 切换到注册选项卡时，自动生成UUID
  if (newVal && activeTab.value === 'register' && !newUuid.value) {
    generateRandomUuid()
  }
})

// 监听选项卡切换
watch(activeTab, (newVal) => {
  if (newVal === 'load' && accountStore.isAuthenticated && isOpen.value) {
    loadAccountDevices()
  }
  if (newVal === 'register' && !newUuid.value) {
    generateRandomUuid()
  }
})

// 监听是否登录，自动设置绑定选项
watch(() => accountStore.isAuthenticated, (isAuth) => {
  if (isAuth && activeTab.value === 'register') {
    bindToAccount.value = true
  } else if (!isAuth) {
    bindToAccount.value = false
  }
})

// 生成随机UUID
const generateRandomUuid = () => {
  newUuid.value = generateUUID()
}

// 处理打开登录对话框
 const handleOpenLogin = () => {
  showLoginDialog.value = true
}

// 处理登录成功
const handleLoginSuccess = async (token) => {
  // 关闭登录对话框
  showLoginDialog.value = false
  // 处理登录成功逻辑
  await accountStore.login(token)
  // 自动加载账户设备
  if (activeTab.value === 'load') {
    await loadAccountDevices()
  } else {
    // 在注册模式下自动选中绑定账户
    bindToAccount.value = true
  }
}

// 加载账户绑定的设备
const loadAccountDevices = async () => {
  if (!accountStore.isAuthenticated) {
    return
  }

  loadingDevices.value = true
  try {
    const response = await apiClient.getAccountDevices(accountStore.token)
    accountDevices.value = response.data || []

    if (accountDevices.value.length === 0) {
      toast.info('您的账户暂未绑定任何设备')
    }
  } catch (error) {
    toast.error('加载设备列表失败：' + error.message)
  } finally {
    loadingDevices.value = false
  }
}

// 加载选中的设备
const loadDevice = (device) => {
  deviceStore.setDeviceUuid(device.uuid)
  isOpen.value = false
  emit('confirm')
  resetForm()
  toast.success(`已切换到设备: ${device.name || device.uuid}`)
}

// 注册新设备
const registerDevice = async () => {
  if (!newUuid.value.trim()) {
    toast.error('请输入或生成UUID')
    return
  }

  if (!deviceName.value.trim()) {
    toast.error('请输入设备名称')
    return
  }

  try {
    // 1. 保存UUID到本地
    deviceStore.setDeviceUuid(newUuid.value.trim())

    // 2. 调用设备注册接口（会自动在云端创建设备）
    await apiClient.registerDevice(
      newUuid.value.trim(),
      deviceName.value.trim(),
      accountStore.isAuthenticated ? accountStore.token : null
    )

    // 3. 如果选择绑定到账户，现在可以安全地绑定
    if (bindToAccount.value && accountStore.isAuthenticated) {
      try {
        await apiClient.bindDeviceToAccount(accountStore.token, newUuid.value.trim())
      } catch (error) {
        console.warn('设备绑定失败：', error.message)
        toast.warning('设备注册成功，但绑定到账户失败')
      }
    }

    toast.success(`设备注册成功！UUID: ${newUuid.value.trim()}`)
    isOpen.value = false
    emit('confirm')
    resetForm()

    const message = bindToAccount.value
      ? '设备已注册并绑定到您的账户'
      : '设备已注册'
    toast.success(message)
  } catch (error) {
    toast.error('注册失败：' + error.message)
  }
}

// 重置表单
const resetForm = () => {
  newUuid.value = ''
  deviceName.value = ''
  bindToAccount.value = accountStore.isAuthenticated
  accountDevices.value = []
  activeTab.value = 'load'
}

// 处理弹框关闭
const handleClose = () => {
  // 在required模式下不允许关闭
  if (props.required) {
    toast.error('请先注册或加载设备')
    return
  }
  resetForm()
  isOpen.value = false
}

// 处理ESC键按下，在必须模式下阻止关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.required) {
    e.preventDefault()
    e.stopPropagation()
    toast.error('请先注册或加载设备')
  }
}

// 在组件挂载和卸载时添加/移除事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeydown, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, true)
})
</script>

<template>
  <Dialog
    v-model:open="isOpen"
    @update:open="(val) => !val && (props.required ? isOpen = true : handleClose())">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>设备管理</DialogTitle>
        <DialogDescription>
          加载账户设备或注册新设备
        </DialogDescription>

        <!-- 必需模式的提示 -->
        <div v-if="props.required" class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <div class="flex items-start gap-2">
            <AlertTriangle class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-amber-900 dark:text-amber-100">请先注册或加载设备</p>
              <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
                您需要注册或加载一个设备才能继续使用。
              </p>
            </div>
          </div>
        </div>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="load">
            <Download class="h-4 w-4 mr-2" />
            加载设备
          </TabsTrigger>
          <TabsTrigger value="register">
            <Plus class="h-4 w-4 mr-2" />
            注册设备
          </TabsTrigger>
        </TabsList>

        <!-- 加载设备选项卡 -->
        <TabsContent value="load" class="space-y-4 mt-4">
          <div v-if="!accountStore.isAuthenticated" class="text-center py-8">
            <p class="text-muted-foreground mb-4">请先登录以查看您的设备列表</p>
            <Button variant="outline" @click="handleOpenLogin">
              登录账户
            </Button>
          </div>

          <div v-else-if="loadingDevices" class="text-center py-8">
            <p class="text-muted-foreground">加载中...</p>
          </div>

          <div v-else-if="accountDevices.length === 0" class="text-center py-8">
            <p class="text-muted-foreground mb-4">您的账户暂未绑定任何设备</p>
            <Button variant="outline" @click="activeTab = 'register'">
              <Plus class="h-4 w-4 mr-2" />
              注册新设备
            </Button>
          </div>

          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="device in accountDevices"
              :key="device.uuid"
              class="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              @click="loadDevice(device)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-medium text-base">
                    {{ device.name || '未命名设备' }}
                  </div>
                  <code class="text-xs text-muted-foreground block mt-1">
                    {{ device.uuid }}
                  </code>
                  <div class="text-xs text-muted-foreground mt-2">
                    创建时间: {{ new Date(device.createdAt).toLocaleString('zh-CN') }}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  @click.stop="loadDevice(device)"
                >
                  加载
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- 注册设备选项卡 -->
        <TabsContent value="register" class="space-y-4 mt-4">
          <div class="space-y-4">
            <!-- UUID输入 -->
            <div class="space-y-2">
              <Label for="registerUuid">设备 UUID</Label>
              <div class="flex gap-2">
                <Input
                  id="registerUuid"
                  v-model="newUuid"
                  placeholder="自动生成或手动输入UUID"
                  class="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  @click="generateRandomUuid"
                  title="生成随机UUID"
                >
                  <Shuffle class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- 设备名称输入 -->
            <div class="space-y-2">
              <Label for="deviceName">设备名称</Label>
              <Input
                id="deviceName"
                v-model="deviceName"
                placeholder="为设备设置一个易于识别的名称"
                required
              />
            </div>

            <Separator />

            <!-- 绑定到账户选项 -->
            <div class="flex items-start space-x-3 p-4 rounded-lg border">
              <Checkbox
                id="bindToAccount"
                v-model:checked="bindToAccount"
                :disabled="!accountStore.isAuthenticated"
              />
              <div class="flex-1">
                <label
                  for="bindToAccount"
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  绑定到账户
                </label>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ accountStore.isAuthenticated
                    ? `将此设备绑定到账户 ${accountStore.userName}，绑定后可在其他设备上快速加载`
                    : '登录后可以将设备绑定到您的账户'
                  }}
                </p>
              </div>
            </div>

            <!-- 提示信息 -->
            <div class="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p><strong>提示:</strong></p>
              <ul class="list-disc list-inside mt-1 space-y-1">
                <li>UUID将保存到本地浏览器存储</li>
                <li v-if="deviceName">设备名称将帮助您快速识别不同的设备</li>
                <li v-if="bindToAccount && accountStore.isAuthenticated">绑定后可在任何设备上通过账户加载</li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              @click="handleClose"
              :disabled="props.required"
              :title="props.required ? '必须先注册设备' : '取消'"
            >
              取消
            </Button>
            <Button @click="registerDevice" :disabled="!newUuid.trim() || !deviceName.trim()">
              <Plus class="h-4 w-4 mr-2" />
              注册设备
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>

  <!-- 登录对话框 -->
  <LoginDialog
    v-model="showLoginDialog"
    :on-success="handleLoginSuccess"
  />
</template>
