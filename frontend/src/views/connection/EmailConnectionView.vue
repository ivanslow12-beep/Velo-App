<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Email Connection Management</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Integrasi mailbox penerimaan permintaan IWO otomatis.</p>
      </div>
      <button @click="openCreateModal" class="btn-primary text-xs">
        <PlusIcon class="w-4 h-4" />
        <span>Tambah Koneksi Email</span>
      </button>
    </div>

    <!-- Connections List Table -->
    <div class="card overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr>
            <th class="table-header">Connection Name</th>
            <th class="table-header">Provider</th>
            <th class="table-header">Email Address (Editable)</th>
            <th class="table-header">Folder</th>
            <th class="table-header">Sync Interval</th>
            <th class="table-header">Status</th>
            <th class="table-header">Last Sync</th>
            <th class="table-header text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="table-cell text-center py-10 text-slate-400">Memuat koneksi email...</td>
          </tr>
          <tr v-else-if="!connections.length">
            <td colspan="8" class="table-cell text-center py-10 text-slate-400">Belum ada koneksi email dikonfigurasi</td>
          </tr>
          <tr v-for="conn in connections" :key="conn.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td class="table-cell font-bold text-slate-900 dark:text-white">{{ conn.name }}</td>
            <td class="table-cell">
              <span class="badge badge-info">{{ conn.provider }}</span>
            </td>
            <td class="table-cell font-mono text-blue-600 dark:text-blue-400 font-semibold">{{ conn.email_address }}</td>
            <td class="table-cell font-mono">{{ conn.folder }}</td>
            <td class="table-cell">{{ conn.sync_interval }} Menit</td>
            <td class="table-cell">
              <span
                class="badge"
                :class="conn.status === 'ACTIVE' ? 'badge-active' : conn.status === 'ERROR' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' : 'badge-inactive'"
                :title="conn.last_error || conn.status"
              >
                {{ conn.status }}
              </span>
              <p v-if="conn.last_error" class="text-[10px] text-rose-600 mt-1 max-w-48 truncate" :title="conn.last_error">
                {{ conn.last_error }}
              </p>
            </td>
            <td class="table-cell text-[11px] text-slate-500">{{ formatDate(conn.last_sync_at) }}</td>
            <td class="table-cell text-right space-x-2">
              <button @click="testConnection(conn)" class="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                Test
              </button>
              <button @click="syncNow(conn)" class="text-xs font-semibold text-blue-600 hover:text-blue-800">
                Sync Now
              </button>
              <button @click="openRules(conn)" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Filter
              </button>
              <button @click="openEditModal(conn)" class="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline">
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- EDIT / CREATE MODAL -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-lg w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">
          {{ editingId ? 'Edit Email Connection' : 'Tambah Email Connection' }}
        </h2>
        <p class="text-[11px] text-slate-400">
          Email address dapat diubah tanpa menghapus riwayat email atau IWO yang telah terhubung sebelumnya.
        </p>

        <form @submit.prevent="submitForm" class="space-y-3">
          <div>
            <label class="form-label">Connection Name *</label>
            <input v-model="form.name" required class="form-input text-xs" placeholder="e.g. Inbox Intake IWO" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Provider *</label>
              <select v-model="form.provider" class="form-input text-xs">
                <option value="GMAIL">Google Workspace / Gmail</option>
                <option value="OUTLOOK">Microsoft 365 / Outlook</option>
                <option value="CUSTOM">Generic IMAP / SMTP</option>
              </select>
            </div>
            <div>
              <label class="form-label">Auth Type</label>
              <select v-model="form.auth_type" class="form-input text-xs">
                <option value="PASSWORD">Password / App Password</option>
                <option value="OAUTH2">OAuth 2.0</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Email Address (Mailbox) *</label>
            <input
              type="email"
              v-model="form.email_address"
              required
              class="form-input text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
              placeholder="order.iwo@velo.co.id"
            />
          </div>

          <div v-if="form.auth_type === 'PASSWORD'">
            <label class="form-label">{{ editingId ? 'Password / App Password' : 'Password / App Password *' }}</label>
            <input
              type="password"
              v-model="form.password"
              :required="!editingId"
              autocomplete="new-password"
              class="form-input text-xs"
              :placeholder="editingId ? 'Kosongkan jika tidak ingin mengganti' : 'Masukkan password mailbox'"
            />
          </div>

          <div v-else>
            <label class="form-label">{{ editingId ? 'OAuth Access Token' : 'OAuth Access Token *' }}</label>
            <input
              type="password"
              v-model="form.oauth_token"
              :required="!editingId"
              autocomplete="new-password"
              class="form-input text-xs"
              :placeholder="editingId ? 'Kosongkan jika tidak ingin mengganti' : 'Masukkan access token OAuth'"
            />
          </div>

          <div v-if="form.provider === 'CUSTOM'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">IMAP Host</label>
              <input v-model="form.imap_host" class="form-input text-xs font-mono" placeholder="mail.velo.co.id" />
            </div>
            <div>
              <label class="form-label">IMAP Port</label>
              <input type="number" v-model="form.imap_port" class="form-input text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Folder</label>
              <input v-model="form.folder" class="form-input text-xs font-mono" placeholder="INBOX" />
            </div>
            <div>
              <label class="form-label">Sync Interval (Menit)</label>
              <input type="number" v-model="form.sync_interval" class="form-input text-xs" />
            </div>
          </div>

          <div>
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-input text-xs">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t">
            <button type="button" @click="showModal = false" class="btn-secondary text-xs">Batal</button>
            <button type="submit" class="btn-primary text-xs">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Email filter rules -->
    <div v-if="filterModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-2xl w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Filter Email IWO VELO</h2>
          <p class="text-[11px] text-slate-500 mt-1">
            {{ filterConnection?.email_address }} · Kata IWO dan VELO wajib ada; semua aturan penerimaan aktif harus cocok, sedangkan aturan penolakan mengecualikan email yang cocok.
          </p>
        </div>

        <div v-if="!rules.some((rule) => rule.is_active)" class="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300">
          Filter bawaan hanya menerima email yang memuat kata “IWO” dan “VELO” di pengirim, subjek, penerima, atau isi.
        </div>

        <div class="max-h-48 overflow-y-auto space-y-2">
          <div v-for="rule in rules" :key="rule.id" class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs">
            <div>
              <div class="font-semibold">{{ rule.name }} <span v-if="!rule.is_active" class="text-slate-400">(nonaktif)</span></div>
              <div class="text-slate-500 mt-0.5">{{ rule.condition_field }} {{ rule.condition_operator }} “{{ rule.condition_value }}” · {{ rule.action }}</div>
            </div>
            <button type="button" @click="deleteRule(rule)" class="text-rose-600 hover:text-rose-800">Hapus</button>
          </div>
          <p v-if="!rules.length" class="py-3 text-center text-xs text-slate-400">Belum ada aturan tambahan.</p>
        </div>

        <form @submit.prevent="addRule" class="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
          <input v-model="ruleForm.name" required class="form-input text-xs" placeholder="Nama aturan (contoh: Sender VELO)" />
          <select v-model="ruleForm.condition_field" class="form-input text-xs">
            <option value="FROM">Pengirim (From)</option>
            <option value="SUBJECT">Subjek</option>
            <option value="TO">Penerima (To)</option>
            <option value="BODY">Isi email</option>
          </select>
          <select v-model="ruleForm.condition_operator" class="form-input text-xs">
            <option value="CONTAINS">Mengandung</option>
            <option value="EQUALS">Sama dengan</option>
            <option value="STARTS_WITH">Diawali dengan</option>
          </select>
          <input v-model="ruleForm.condition_value" required class="form-input text-xs" placeholder="Nilai yang dicocokkan" />
          <select v-model="ruleForm.action" class="form-input text-xs sm:col-span-2">
            <option value="LINK_IWO">Terima email</option>
            <option value="MARK_READ">Terima sebagai sudah dibaca</option>
            <option value="SKIP">Tolak email yang cocok</option>
          </select>
          <div class="flex justify-end gap-2 sm:col-span-2">
            <button type="button" @click="filterModal = false" class="btn-secondary text-xs">Tutup</button>
            <button type="submit" class="btn-primary text-xs">Tambah Aturan</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/index.js'
import { Plus as PlusIcon } from 'lucide-vue-next'

const connections = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref(null)
const filterModal = ref(false)
const filterConnection = ref(null)
const rules = ref([])

const form = ref({
  name: '',
  provider: 'GMAIL',
  auth_type: 'PASSWORD',
  email_address: '',
  imap_host: '',
  imap_port: 993,
  password: '',
  oauth_token: '',
  folder: 'INBOX',
  sync_interval: 5,
  status: 'ACTIVE',
})

const ruleForm = ref({
  name: '',
  condition_field: 'FROM',
  condition_operator: 'CONTAINS',
  condition_value: '',
  action: 'LINK_IWO',
})

function formatDate(val) {
  if (!val) return 'Belum pernah sync'
  return new Date(val).toLocaleString('id-ID')
}

async function fetchConnections() {
  loading.value = true
  try {
    const res = await api.get('/email-connections')
    connections.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch connections:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    name: '',
    provider: 'GMAIL',
    auth_type: 'PASSWORD',
    email_address: '',
    imap_host: '',
    imap_port: 993,
    password: '',
    oauth_token: '',
    folder: 'INBOX',
    sync_interval: 5,
    status: 'ACTIVE',
  }
  showModal.value = true
}

function openEditModal(conn) {
  editingId.value = conn.id
  form.value = { ...conn }
  showModal.value = true
}

async function submitForm() {
  try {
    const payload = { ...form.value }
    if (!payload.password) delete payload.password
    if (!payload.oauth_token) delete payload.oauth_token
    if (editingId.value) {
      await api.patch(`/email-connections/${editingId.value}`, payload)
    } else {
      await api.post('/email-connections', payload)
    }
    showModal.value = false
    fetchConnections()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menyimpan koneksi')
  }
}

async function testConnection(conn) {
  try {
    const res = await api.post(`/email-connections/${conn.id}/test`)
    alert(res.data.data.message)
  } catch (err) {
    alert(err.response?.data?.message || 'Koneksi gagal terhubung')
  }
}

async function syncNow(conn) {
  try {
    const res = await api.post(`/email-connections/${conn.id}/sync`, {}, { timeout: 360000 })
    const data = res.data.data
    const continuation = data.has_more ? ' Masih ada email yang akan dilanjutkan pada sync berikutnya.' : ''
    alert(`${res.data.message}: ${data.new_messages_count} email diterima, ${data.ignored_messages_count} difilter.${continuation}`)
    fetchConnections()
  } catch (err) {
    fetchConnections()
    const message = err.response?.data?.message
      || (err.code === 'ECONNABORTED'
        ? 'Proses sinkronisasi melebihi batas waktu tunggu. Coba Sync Now kembali; proses akan melanjutkan dari email terakhir.'
        : err.message)
      || 'Gagal menyinkronkan email'
    alert(`Gagal menyinkronkan email: ${message}`)
  }
}

async function openRules(conn) {
  filterConnection.value = conn
  ruleForm.value = {
    name: '',
    condition_field: 'FROM',
    condition_operator: 'CONTAINS',
    condition_value: '',
    action: 'LINK_IWO',
  }
  try {
    const res = await api.get(`/email-connections/${conn.id}/rules`)
    rules.value = res.data.data
    filterModal.value = true
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal memuat aturan filter')
  }
}

async function addRule() {
  try {
    const res = await api.post(`/email-connections/${filterConnection.value.id}/rules`, ruleForm.value)
    rules.value.push(res.data.data)
    ruleForm.value = {
      name: '',
      condition_field: 'FROM',
      condition_operator: 'CONTAINS',
      condition_value: '',
      action: 'LINK_IWO',
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menambahkan aturan filter')
  }
}

async function deleteRule(rule) {
  try {
    await api.delete(`/email-connections/${filterConnection.value.id}/rules/${rule.id}`)
    rules.value = rules.value.filter((item) => item.id !== rule.id)
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menghapus aturan filter')
  }
}

onMounted(() => {
  fetchConnections()
})
</script>
