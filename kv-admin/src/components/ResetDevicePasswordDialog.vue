<script setup>
import { ref, computed } from 'vue'
import { useAccountStore } from '@/stores/account'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasswordInput from './PasswordInput.vue'
import { toast } from 'vue-sonner'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  deviceUuid: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const accountStore = useAccountStore()

const password = ref('')
const isSubmitting = ref(false)
const showDeleteConfirm = ref(false)
const showHintDialog = ref(false)
const passwordHint = ref('')
const isSettingHint = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (!val) {
      password.value = ''
    }
    emit('update:modelValue', val)
  }
})

const resetPassword = async () => {
  if (!password.value.trim()) {
    toast.error('请输入新密码')
    return
  }

  isSubmitting.value = true
  try {
    // 账户拥有者使用专门的重置接口，无需当前密码
    if (accountStore.isAuthenticated) {
      await apiClient.resetDevicePasswordAsOwner(
        props.deviceUuid,
        password.value,
        null, // passwordHint 可以后续单独设置
        accountStore.token
      )
    } else {
      // 非账户拥有者使用普通设置密码接口
      await apiClient.setDevicePassword(
        props.deviceUuid,
        { password: password.value }
      )
    }

    toast.success('密码重置成功')
    isOpen.value = false
    emit('success')
  } catch (error) {
    toast.error('重置密码失败：' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDeletePassword = () => {
  // 先关闭主弹框，避免重叠
  isOpen.value = false
  // 延迟打开删除确认弹框，确保主弹框完全关闭
  setTimeout(() => {
    showDeleteConfirm.value = true
  }, 100)
}

const deletePassword = async () => {
  isSubmitting.value = true
  try {
    await apiClient.deleteDevicePassword(props.deviceUuid, null, accountStore.token)
    toast.success('密码已删除')
    showDeleteConfirm.value = false
    emit('success')
  } catch (error) {
    toast.error('删除密码失败：' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

const openHintDialog = () => {
  // 先关闭主弹框，避免重叠
  isOpen.value = false
  // 延迟打开设置提示弹框，确保主弹框完全关闭
  setTimeout(() => {
    showHintDialog.value = true
  }, 100)
}

const setPasswordHint = async () => {
  isSettingHint.value = true
  try {
    await apiClient.setDevicePasswordHint(
      props.deviceUuid,
      passwordHint.value,
      null,
      accountStore.token
    )
    toast.success('密码提示已设置')
    showHintDialog.value = false
    passwordHint.value = ''
    emit('success')
  } catch (error) {
    toast.error('设置密码提示失败：' + error.message)
  } finally {
    isSettingHint.value = false
  }
}

const handleDeleteCancel = () => {
  showDeleteConfirm.value = false
  // 延迟打开主弹框，避免重叠
  setTimeout(() => {
    isOpen.value = true
  }, 100)
}

const handleHintCancel = () => {
  showHintDialog.value = false
  passwordHint.value = ''
  // 延迟打开主弹框，避免重叠
  setTimeout(() => {
    isOpen.value = true
  }, 100)
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>重置设备密码</DialogTitle>
        <DialogDescription>
          为设备 {{ deviceName || deviceUuid }} 设置新密码
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            您已登录绑定的账户，可以直接重置密码而无需输入当前密码
          </p>
        </div>

        <div>
          <PasswordInput
            v-model="password"
            label="新密码"
            placeholder="输入新密码"
            :show-hint="false"
            :show-strength="true"
            :min-length="8"
            required
          />
        </div>
      </div>

      <DialogFooter class="flex-col gap-2 sm:flex-row sm:justify-between">
        <div class="flex gap-2">
          <Button
            variant="destructive"
            @click="confirmDeletePassword"
            :disabled="isSubmitting"
            class="flex-1 sm:flex-none"
          >
            删除密码
          </Button>
          <Button
            variant="outline"
            @click="openHintDialog"
            :disabled="isSubmitting"
            class="flex-1 sm:flex-none"
          >
            设置提示
          </Button>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="isOpen = false" :disabled="isSubmitting">
            取消
          </Button>
          <Button @click="resetPassword" :disabled="isSubmitting || !password.trim()">
            {{ isSubmitting ? '重置中...' : '确认重置' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 删除密码确认对话框 -->
  <AlertDialog v-model:open="showDeleteConfirm">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除密码</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除设备 "{{ deviceName || deviceUuid }}" 的密码吗？删除后任何人都可以访问该设备。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleDeleteCancel">取消</AlertDialogCancel>
        <AlertDialogAction @click="deletePassword" :disabled="isSubmitting">
          {{ isSubmitting ? '删除中...' : '确认删除' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 设置密码提示对话框 -->
  <Dialog v-model:open="showHintDialog">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>设置密码提示</DialogTitle>
        <DialogDescription>
          为设备 {{ deviceName || deviceUuid }} 设置密码提示
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div>
          <Label for="hint">密码提示</Label>
          <Input
            id="hint"
            v-model="passwordHint"
            placeholder="输入密码提示（可选）"
            :disabled="isSettingHint"
            class="mt-1.5"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleHintCancel" :disabled="isSettingHint">
          取消
        </Button>
        <Button @click="setPasswordHint" :disabled="isSettingHint">
          {{ isSettingHint ? '设置中...' : '确认设置' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
