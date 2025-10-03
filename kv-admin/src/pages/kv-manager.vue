<template>
  <div class="kv-manager-container">
    <div class="header">
      <h1>键值管理器</h1>
      <p class="subtitle">使用 Token 访问和管理键值对数据</p>
    </div>

    <!-- Token 输入区 -->
    <div v-if="!isTokenSet" class="token-input-section">
      <div class="input-group">
        <input
          v-model="tokenInput"
          type="text"
          placeholder="请输入应用 Token"
          @keypress.enter="handleSetToken"
          class="token-input"
        />
        <button @click="handleSetToken" :disabled="!tokenInput.trim()" class="btn-primary">
          确定
        </button>
      </div>
      <p v-if="tokenError" class="error-msg">{{ tokenError }}</p>
    </div>

    <!-- 键值列表区 -->
    <div v-else class="kv-list-section">
      <div class="toolbar">
        <div class="search-group">
          <input
            v-model="searchPattern"
            type="text"
            placeholder="搜索键名（支持通配符 *）"
            @keypress.enter="loadKeys"
            class="search-input"
          />
          <button @click="loadKeys" class="btn-secondary">搜索</button>
        </div>
        <div class="actions">
          <button @click="showAddDialog = true" class="btn-primary">添加键值</button>
          <button @click="handleLogout" class="btn-secondary">退出</button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading">加载中...</div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-banner">{{ error }}</div>

      <!-- 键值对表格 -->
      <div v-if="!loading && keys.length > 0" class="table-container">
        <table class="kv-table">
          <thead>
            <tr>
              <th>键名</th>
              <th>值</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in paginatedKeys" :key="key">
              <td class="key-cell">{{ key }}</td>
              <td class="value-cell">
                <div v-if="loadingValues[key]" class="value-loading">加载中...</div>
                <div v-else-if="values[key] !== undefined" class="value-content">
                  <pre>{{ formatValue(values[key]) }}</pre>
                </div>
                <button v-else @click="loadValue(key)" class="btn-link">查看</button>
              </td>
              <td class="actions-cell">
                <button @click="editKey(key)" class="btn-edit">编辑</button>
                <button @click="deleteKey(key)" class="btn-delete">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页控件 -->
        <div class="pagination">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="btn-secondary"
          >
            上一页
          </button>
          <span class="page-info">
            第 {{ currentPage }} / {{ totalPages }} 页（共 {{ keys.length }} 条）
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="btn-secondary"
          >
            下一页
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && keys.length === 0" class="empty-state">
        <p>暂无键值对数据</p>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <div v-if="showAddDialog || editingKey" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <h2>{{ editingKey ? '编辑键值' : '添加键值' }}</h2>
        <div class="form-group">
          <label>键名</label>
          <input
            v-model="dialogKey"
            type="text"
            :disabled="!!editingKey"
            placeholder="请输入键名"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>值（JSON 格式）</label>
          <textarea
            v-model="dialogValue"
            rows="8"
            placeholder='例如: "字符串" 或 {"key": "value"}'
            class="form-textarea"
          ></textarea>
        </div>
        <p v-if="dialogError" class="error-msg">{{ dialogError }}</p>
        <div class="dialog-actions">
          <button @click="closeDialog" class="btn-secondary">取消</button>
          <button @click="saveKeyValue" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '../lib/api'

const tokenInput = ref('')
const isTokenSet = ref(false)
const currentToken = ref('')
const tokenError = ref('')

const searchPattern = ref('*')
const keys = ref([])
const values = ref({})
const loadingValues = ref({})
const loading = ref(false)
const error = ref('')

const currentPage = ref(1)
const pageSize = ref(10)

const showAddDialog = ref(false)
const editingKey = ref('')
const dialogKey = ref('')
const dialogValue = ref('')
const dialogError = ref('')

const totalPages = computed(() => Math.ceil(keys.value.length / pageSize.value))

const paginatedKeys = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return keys.value.slice(start, end)
})

const handleSetToken = async () => {
  tokenError.value = ''
  const token = tokenInput.value.trim()

  if (!token) {
    tokenError.value = '请输入 Token'
    return
  }

  // 验证 token 是否有效
  try {
    await apiClient.getKVKeys(token, '*')
    currentToken.value = token
    isTokenSet.value = true
    loadKeys()
  } catch (err) {
    tokenError.value = '无效的 Token 或无权限访问'
  }
}

const loadKeys = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await apiClient.getKVKeys(currentToken.value, searchPattern.value)
    keys.value = response.keys || []
    currentPage.value = 1
    values.value = {}
  } catch (err) {
    error.value = err.message || '加载键名失败'
  } finally {
    loading.value = false
  }
}

const loadValue = async (key) => {
  loadingValues.value[key] = true

  try {
    const response = await apiClient.getKVItem(currentToken.value, key)
    values.value[key] = response.value
  } catch (err) {
    error.value = `加载键 "${key}" 的值失败: ${err.message}`
  } finally {
    delete loadingValues.value[key]
  }
}

const formatValue = (value) => {
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value, null, 2)
}

const editKey = async (key) => {
  editingKey.value = key
  dialogKey.value = key
  dialogError.value = ''

  // 加载值
  try {
    const response = await apiClient.getKVItem(currentToken.value, key)
    dialogValue.value = formatValue(response.value)
  } catch (err) {
    dialogError.value = '加载值失败'
  }
}

const saveKeyValue = async () => {
  dialogError.value = ''

  const key = dialogKey.value.trim()
  const valueStr = dialogValue.value.trim()

  if (!key) {
    dialogError.value = '请输入键名'
    return
  }

  if (!valueStr) {
    dialogError.value = '请输入值'
    return
  }

  // 解析 JSON
  let value
  try {
    value = JSON.parse(valueStr)
  } catch (err) {
    dialogError.value = '值必须是有效的 JSON 格式'
    return
  }

  try {
    await apiClient.setKVItem(currentToken.value, key, value)
    closeDialog()
    loadKeys()
  } catch (err) {
    dialogError.value = err.message || '保存失败'
  }
}

const deleteKey = async (key) => {
  if (!confirm(`确定要删除键 "${key}" 吗？`)) {
    return
  }

  try {
    await apiClient.deleteKVItem(currentToken.value, key)
    loadKeys()
  } catch (err) {
    error.value = `删除键 "${key}" 失败: ${err.message}`
  }
}

const closeDialog = () => {
  showAddDialog.value = false
  editingKey.value = ''
  dialogKey.value = ''
  dialogValue.value = ''
  dialogError.value = ''
}

const handleLogout = () => {
  if (confirm('确定要退出吗？')) {
    isTokenSet.value = false
    currentToken.value = ''
    tokenInput.value = ''
    keys.value = []
    values.value = {}
  }
}
</script>

<style scoped>
.kv-manager-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
}

.token-input-section {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.token-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.token-input:focus {
  outline: none;
  border-color: #007bff;
}

.kv-list-section {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-group {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  min-width: 300px;
}

.search-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link {
  padding: 0.25rem 0.5rem;
  background: none;
  color: #007bff;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.btn-edit {
  padding: 0.25rem 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.btn-edit:hover {
  background: #218838;
}

.btn-delete {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-delete:hover {
  background: #c82333;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-msg {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.kv-table {
  width: 100%;
  border-collapse: collapse;
}

.kv-table th,
.kv-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.kv-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.key-cell {
  font-family: monospace;
  font-weight: 500;
}

.value-cell {
  max-width: 400px;
}

.value-content pre {
  margin: 0;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.value-loading {
  color: #666;
  font-style: italic;
}

.actions-cell {
  white-space: nowrap;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
}

.page-info {
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 500px;
  max-width: 600px;
}

.dialog h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-textarea {
  font-family: monospace;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>
