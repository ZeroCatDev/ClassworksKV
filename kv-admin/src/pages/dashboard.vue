<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiClient } from '@/lib/api'
import { tokenStore } from '@/lib/tokenStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2, Eye, ArrowLeft, RefreshCw, Edit, Home } from 'lucide-vue-next'

defineOptions({
  meta: {
    requiresAuth: true
  }
})

const token = ref('')
const appName = ref('')
const items = ref([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const totalRows = ref(0)
const currentPage = ref(0)
const pageSize = ref(20)

// Dialog states
const showCreateDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)
const showEditDialog = ref(false)

// Form data
const newKey = ref('')
const newValue = ref('{}')
const selectedItem = ref(null)
const editValue = ref('')

// Search and filter
const searchQuery = ref('')
const sortBy = ref('key')
const sortDir = ref('asc')

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value
  return items.value.filter(item =>
    item.key.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const loadItems = async () => {
  if (!token.value) return

  isLoading.value = true
  try {
    const response = await apiClient.listKVItems(token.value, {
      sortBy: sortBy.value,
      sortDir: sortDir.value,
      limit: pageSize.value,
      skip: currentPage.value * pageSize.value,
    })
    items.value = response.items
    totalRows.value = response.total_rows
  } catch (error) {
    console.error('Failed to load items:', error)
    if (error instanceof Error && error.message.includes('401')) {
      logout()
    }
  } finally {
    isLoading.value = false
  }
}

const refreshItems = async () => {
  isRefreshing.value = true
  await loadItems()
  isRefreshing.value = false
}

const createItem = async () => {
  if (!newKey.value || !newValue.value) return

  try {
    const value = JSON.parse(newValue.value)
    await apiClient.setKVItem(token.value, newKey.value, value)
    await loadItems()
    showCreateDialog.value = false
    newKey.value = ''
    newValue.value = '{}'
  } catch (error) {
    console.error('Failed to create item:', error)
    alert('创建失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const viewItem = async (item) => {
  selectedItem.value = item
  showViewDialog.value = true
}

const editItem = (item) => {
  selectedItem.value = item
  editValue.value = JSON.stringify(item.value, null, 2)
  showEditDialog.value = true
}

const updateItem = async () => {
  if (!selectedItem.value) return

  try {
    const value = JSON.parse(editValue.value)
    await apiClient.setKVItem(token.value, selectedItem.value.key, value)
    await loadItems()
    showEditDialog.value = false
  } catch (error) {
    console.error('Failed to update item:', error)
    alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const confirmDelete = (item) => {
  selectedItem.value = item
  showDeleteDialog.value = true
}

const deleteItem = async () => {
  if (!selectedItem.value) return

  try {
    await apiClient.deleteKVItem(token.value, selectedItem.value.key)
    await loadItems()
    showDeleteDialog.value = false
    selectedItem.value = null
  } catch (error) {
    console.error('Failed to delete item:', error)
    alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const goHome = () => {
  window.location.href = '/'
}

const nextPage = () => {
  if ((currentPage.value + 1) * pageSize.value < totalRows.value) {
    currentPage.value++
    loadItems()
  }
}

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
    loadItems()
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  const activeToken = tokenStore.getActiveToken()
  if (!activeToken) {
    window.location.href = '/'
    return
  }
  token.value = activeToken.token
  appName.value = activeToken.appName || '未命名应用'
  loadItems()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b bg-background">
      <div class="container mx-auto px-6 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" @click="goHome">
              <Home class="h-5 w-5" />
            </Button>
            <div class="space-y-1">
              <h1 class="text-xl font-bold">{{ appName }} - 数据管理</h1>
              <p class="text-sm text-muted-foreground">{{ totalRows }} 条键值对</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="ghost" size="icon" @click="refreshItems" :disabled="isRefreshing">
              <RefreshCw :class="{ 'animate-spin': isRefreshing }" class="h-5 w-5" />
            </Button>
            <Button @click="showCreateDialog = true">
              <Plus class="mr-2 h-4 w-4" />
              新建
            </Button>
          </div>
        </div>
      </div>
    </header>

    <main class="container mx-auto py-8 px-6">
      <!-- Search and Filters -->
      <div class="flex gap-4 mb-6">
        <div class="flex-1">
          <Input
            v-model="searchQuery"
            placeholder="搜索键名..."
            class="max-w-sm"
          />
        </div>
        <Select v-model="sortBy" @update:model-value="loadItems">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="key">按键名</SelectItem>
            <SelectItem value="createdAt">按创建时间</SelectItem>
            <SelectItem value="updatedAt">按更新时间</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="sortDir" @update:model-value="loadItems">
          <SelectTrigger class="w-[120px]">
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">升序</SelectItem>
            <SelectItem value="desc">降序</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Table -->
      <div v-else-if="filteredItems.length > 0" class="rounded-lg border">
        <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[30%]">键名</TableHead>
                  <TableHead class="w-[20%]">创建时间</TableHead>
                  <TableHead class="w-[20%]">更新时间</TableHead>
                  <TableHead class="w-[15%]">创建者 IP</TableHead>
                  <TableHead class="w-[15%] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="item in filteredItems" :key="item.key">
                  <TableCell class="font-mono font-medium">{{ item.key }}</TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ formatDate(item.createdAt) }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ formatDate(item.updatedAt) }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ item.creatorIp }}
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" @click="viewItem(item)">
                        <Eye class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" @click="editItem(item)">
                        <Edit class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" @click="confirmDelete(item)">
                        <Trash2 class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-16 space-y-3">
            <p class="text-muted-foreground">暂无数据</p>
            <Button variant="link" @click="showCreateDialog = true">
              创建第一个键值对
            </Button>
          </div>

      <!-- Pagination -->
      <div v-if="!isLoading && totalRows > pageSize" class="flex items-center justify-between mt-6 px-4 py-4 border-t">
        <p class="text-sm text-muted-foreground">
          显示 {{ currentPage * pageSize + 1 }} - {{ Math.min((currentPage + 1) * pageSize, totalRows) }} / {{ totalRows }}
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="prevPage"
            :disabled="currentPage === 0"
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="nextPage"
            :disabled="(currentPage + 1) * pageSize >= totalRows"
          >
            下一页
          </Button>
        </div>
      </div>
    </main>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent>
        <DialogHeader class="space-y-2">
          <DialogTitle>新建键值对</DialogTitle>
          <DialogDescription>创建一个新的键值对</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="new-key">键名</Label>
            <Input id="new-key" v-model="newKey" placeholder="例如：user:123" />
          </div>
          <div class="space-y-2">
            <Label for="new-value">值 (JSON)</Label>
            <textarea
              id="new-value"
              v-model="newValue"
              class="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              placeholder='{"name": "John", "age": 30}'
            />
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="showCreateDialog = false">取消</Button>
          <Button @click="createItem">创建</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- View Dialog -->
    <Dialog v-model:open="showViewDialog">
      <DialogContent>
        <DialogHeader class="space-y-2">
          <DialogTitle>查看键值对</DialogTitle>
          <DialogDescription>{{ selectedItem?.key }}</DialogDescription>
        </DialogHeader>
        <div v-if="selectedItem" class="space-y-4 py-4">
          <div class="rounded-lg bg-muted p-4">
            <pre class="text-sm overflow-auto max-h-[400px]">{{ JSON.stringify(selectedItem.value, null, 2) }}</pre>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <span class="text-muted-foreground">设备 ID:</span>
              <p class="font-mono text-xs break-all">{{ selectedItem.deviceId }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-muted-foreground">创建者 IP:</span>
              <p>{{ selectedItem.creatorIp }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-muted-foreground">创建时间:</span>
              <p>{{ formatDate(selectedItem.createdAt) }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-muted-foreground">更新时间:</span>
              <p>{{ formatDate(selectedItem.updatedAt) }}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button @click="showViewDialog = false">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent>
        <DialogHeader class="space-y-2">
          <DialogTitle>编辑键值对</DialogTitle>
          <DialogDescription>{{ selectedItem?.key }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="edit-value">值 (JSON)</Label>
            <textarea
              id="edit-value"
              v-model="editValue"
              class="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="showEditDialog = false">取消</Button>
          <Button @click="updateItem">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader class="space-y-2">
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除键名为 <strong>{{ selectedItem?.key }}</strong> 的记录吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 mt-4">
          <Button variant="outline" @click="showDeleteDialog = false">取消</Button>
          <Button variant="destructive" @click="deleteItem">删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
