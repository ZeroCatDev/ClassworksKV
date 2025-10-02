<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/lib/api'
import { deviceStore } from '@/lib/deviceStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Key, Shield, RefreshCw, Copy, CheckCircle2, Settings, Package, Clock } from 'lucide-vue-next'
import AppCard from '@/components/AppCard.vue'

const deviceUuid = ref('')
const tokens = ref([])
const isLoading = ref(false)
const copied = ref(null)

// Dialogs
const showAuthorizeDialog = ref(false)
const showRevokeDialog = ref(false)
const showUuidDialog = ref(false)
const showPasswordDialog = ref(false)
const selectedToken = ref(null)

// Form data
const appIdToAuthorize = ref('')
const authPassword = ref('')
const authNote = ref('')
const newUuid = ref('')
const devicePassword = ref('')
const newPassword = ref('')
const currentPassword = ref('')

const hasPassword = ref(false)

//  Group tokens by appId
const groupedByApp = computed(() => {
  const groups = {}
  tokens.value.forEach(token => {
    const appId = token.app.id
    if (!groups[appId]) {
      groups[appId] = {
        appId: appId,
        appName: token.app.name || appId,
        description: token.app.description || '',
        tokens: []
      }
    }
    groups[appId].tokens.push(token)
  })
  return Object.values(groups)
})

const loadTokens = async () => {
  if (!deviceUuid.value) return

  isLoading.value = true
  try {
    const response = await apiClient.getDeviceTokens(deviceUuid.value)
    tokens.value = response.tokens || []
  } catch (error) {
    console.error('Failed to load tokens:', error)
    if (error.message.includes('设备不存在')) {
      tokens.value = []
    }
  } finally {
    isLoading.value = false
  }
}

const authorizeApp = async () => {
  if (!appIdToAuthorize.value) return

  try {
    const data = {
      deviceUuid: deviceUuid.value,
      note: authNote.value || '授权访问',
    }

    if (hasPassword.value && authPassword.value) {
      data.password = authPassword.value
    }

    await apiClient.authorizeApp(appIdToAuthorize.value, data)
    showAuthorizeDialog.value = false
    appIdToAuthorize.value = ''
    authPassword.value = ''
    authNote.value = ''

    await loadTokens()
  } catch (error) {
    alert('授权失败：' + error.message)
  }
}

const confirmRevoke = (token) => {
  selectedToken.value = token
  showRevokeDialog.value = true
}

const revokeToken = async () => {
  if (!selectedToken.value) return

  try {
    await apiClient.revokeToken(selectedToken.value.token)
    showRevokeDialog.value = false
    selectedToken.value = null
    await loadTokens()
  } catch (error) {
    alert('撤销失败：' + error.message)
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
  if (newUuid.value.trim()) {
    deviceStore.setDeviceUuid(newUuid.value.trim())
  } else {
    deviceStore.generateAndSave()
  }
  deviceUuid.value = deviceStore.getDeviceUuid()
  showUuidDialog.value = false
  newUuid.value = ''
  loadTokens()
}

const setPassword = async () => {
  if (!newPassword.value) return

  try {
    const data = {
      newPassword: newPassword.value,
    }

    if (hasPassword.value) {
      data.currentPassword = currentPassword.value
    }

    await apiClient.setDevicePassword(deviceUuid.value, data)
    deviceStore.setHasPassword(true)
    hasPassword.value = true
    showPasswordDialog.value = false
    newPassword.value = ''
    currentPassword.value = ''
  } catch (error) {
    alert('设置密码失败：' + error.message)
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  deviceUuid.value = deviceStore.getOrGenerate()
  hasPassword.value = deviceStore.hasPassword()
  loadTokens()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <Card class="border-2 shadow-lg">
        <CardHeader>
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle class="text-2xl font-bold flex items-center gap-2">
                <Shield class="h-6 w-6 text-primary" />
                设备授权管理
              </CardTitle>
              <CardDescription class="mt-2">
                管理您的设备 UUID 和应用授权令牌
              </CardDescription>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" @click="showPasswordDialog = true">
                <Key class="h-4 w-4 mr-2" />
                {{ hasPassword ? '修改密码' : '设置密码' }}
              </Button>
              <Button variant="outline" size="sm" @click="showUuidDialog = true">
                <RefreshCw class="h-4 w-4 mr-2" />
                更换 UUID
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Label class="text-sm font-medium whitespace-nowrap">设备 UUID:</Label>
            <code class="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
              {{ deviceUuid }}
            </code>
            <Button
              variant="ghost"
              size="sm"
              @click="copyToClipboard(deviceUuid, 'uuid')"
            >
              <CheckCircle2 v-if="copied === 'uuid'" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4" />
            </Button>
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
            <div v-if="hasPassword" class="space-y-2">
              <Label for="password">设备密码</Label>
              <Input
                id="password"
                v-model="authPassword"
                type="text"
                placeholder="输入设备密码"
              />
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
              确定要撤销此令牌的授权吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div v-if="selectedToken" class="py-4">
            <div class="p-4 bg-muted rounded-lg space-y-2">
              <div class="text-sm">
                <span class="font-medium">应用: </span>
                {{ selectedToken.app.name }}
              </div>
              <div class="text-sm">
                <span class="font-medium">令牌: </span>
                <code class="text-xs">{{ selectedToken.token.slice(0, 16) }}...</code>
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


      <Dialog v-model:open="showUuidDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更换设备 UUID</DialogTitle>
            <DialogDescription>
              输入新的 UUID 或留空以生成随机 UUID
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="newUuid">新 UUID（可选）</Label>
              <Input
                id="newUuid"
                v-model="newUuid"
                placeholder="留空自动生成"
              />
            </div>
            <div class="text-sm text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <strong>警告:</strong> 更换 UUID 后，所有现有授权将失效
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showUuidDialog = false">
              取消
            </Button>
            <Button @click="updateUuid">
              确认更换
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
            <div v-if="hasPassword" class="space-y-2">
              <Label for="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                v-model="currentPassword"
                type="password"
                placeholder="输入当前密码"
              />
            </div>
            <div class="space-y-2">
              <Label for="newPassword">新密码</Label>
              <Input
                id="newPassword"
                v-model="newPassword"
                type="password"
                placeholder="输入新密码"
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
  </div>
</template>