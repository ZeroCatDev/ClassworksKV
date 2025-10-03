<script setup>
import { ref, computed } from 'vue'
import { useAccountStore } from '@/stores/account'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import PasswordInput from './PasswordInput.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  deviceUuid: {
    type: String,
    required: true
  },
  currentName: {
    type: String,
    default: ''
  },
  hasPassword: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const accountStore = useAccountStore()

const deviceName = ref('')
const password = ref('')
const isSubmitting = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) {
      deviceName.value = props.currentName || ''
      password.value = ''
    }
    emit('update:modelValue', val)
  }
})

const needsPassword = computed(() => {
  return props.hasPassword && !accountStore.isAuthenticated
})

const updateDeviceName = async () => {
  if (!deviceName.value.trim()) {
    toast.error('请输入设备名称')
    return
  }

  isSubmitting.value = true
  try {
    await apiClient.setDeviceName(
      props.deviceUuid,
      deviceName.value.trim(),
      needsPassword.value ? password.value : null,
      accountStore.isAuthenticated ? accountStore.token : null
    )

    toast.success('设备名称已更新')
    isOpen.value = false
    emit('success', deviceName.value.trim())
  } catch (error) {
    toast.error('更新失败：' + error.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          <div class="flex items-center gap-2">
            <Edit class="h-5 w-5" />
            编辑设备名称
          </div>
        </DialogTitle>
        <DialogDescription>
          为设备设置一个易于识别的名称
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="deviceName">设备名称</Label>
          <Input
            id="deviceName"
            v-model="deviceName"
            placeholder="输入设备名称"
            @keyup.enter="updateDeviceName"
          />
        </div>

        <div v-if="needsPassword">
          <PasswordInput
            v-model="password"
            label="设备密码"
            placeholder="输入设备密码"
            :device-uuid="deviceUuid"
            :show-hint="true"
            :show-strength="false"
            required
          />
        </div>

        <div v-if="accountStore.isAuthenticated && hasPassword" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            您已登录绑定的账户，无需输入密码
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="isOpen = false" :disabled="isSubmitting">
          取消
        </Button>
        <Button @click="updateDeviceName" :disabled="isSubmitting || !deviceName.trim()">
          {{ isSubmitting ? '更新中...' : '确认' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
