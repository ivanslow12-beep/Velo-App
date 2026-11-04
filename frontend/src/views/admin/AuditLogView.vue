<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Audit Log Sistem</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Catatan audit log aktivitas perubahan sistem bersifat immutable.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <input
            v-model="search"
            @input="debounceSearch"
            placeholder="Cari aksi atau nama aktor..."
            class="form-input text-xs"
          />
        </div>
        <div>
          <select v-model="entityType" @change="fetchLogs" class="form-input text-xs">
            <option value="">Semua Entitas</option>
            <option value="DocumentTemplate">DocumentTemplate</option>
            <option value="DocumentVersion">DocumentVersion</option>
            <option value="BAST">BAST</option>
            <option value="ACC">ACC</option>
            <option value="IWO">IWO</option>
            <option value="EmailConnection">EmailConnection</option>
          </select>
        </div>
        <div class="flex items-center justify-end text-xs text-slate-400">
          Total: <strong>{{ logs.length }}</strong> entri log
        </div>
      </div>
    </div>

    <!-- Audit Logs Table -->
    <div class="card overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr>
            <th class="table-header">Waktu</th>
            <th class="table-header">Aktor</th>
            <th class="table-header">Aksi</th>
            <th class="table-header">Entitas</th>
            <th class="table-header">Detail / After Data</th>
            <th class="table-header">IP / Sumber</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!logs.length">
            <td colspan="6" class="table-cell text-center py-10 text-slate-400">Belum ada catatan audit log</td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td class="table-cell text-slate-500 font-mono text-[11px] whitespace-nowrap">
              {{ formatDate(log.created_at) }}
            </td>
            <td class="table-cell font-semibold">
              {{ log.actor_name || 'System' }}
            </td>
            <td class="table-cell font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
              {{ log.action }}
            </td>
            <td class="table-cell">
              <span class="badge badge-inactive">{{ log.entity_type }}</span>
            </td>
            <td class="table-cell font-mono text-[11px] max-w-xs truncate text-slate-600 dark:text-slate-300">
              {{ log.after_data || '-' }}
            </td>
            <td class="table-cell text-slate-400 text-[11px]">
              {{ log.ip_address || '127.0.0.1' }} ({{ log.source }})
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/index.js'

const logs = ref([])
const search = ref('')
const entityType = ref('')

let timer = null
function debounceSearch() {
  clearTimeout(timer)
  timer = setTimeout(fetchLogs, 300)
}

function formatDate(val) {
  if (!val) return '-'
  return new Date(val).toLocaleString('id-ID')
}

async function fetchLogs() {
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (entityType.value) params.entity_type = entityType.value

    const res = await api.get('/audit-logs', { params })
    logs.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch audit logs:', err)
  }
}

onMounted(() => {
  fetchLogs()
})
</script>
