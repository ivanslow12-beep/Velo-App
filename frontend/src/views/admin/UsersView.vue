<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Kelola Pengguna Sistem</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Role: Administrator, Management, Engineer, Sales.</p>
      </div>
      <button v-if="authStore.isAdmin" @click="openCreateModal" class="btn-primary text-xs">
        <PlusIcon class="w-4 h-4" />
        <span>Tambah Pengguna</span>
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr>
            <th class="table-header">Nama</th>
            <th class="table-header">Email</th>
            <th class="table-header">Role</th>
            <th class="table-header">Status</th>
            <th class="table-header">Terakhir Login</th>
            <th class="table-header text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td class="table-cell font-bold">{{ u.name }}</td>
            <td class="table-cell font-mono">{{ u.email }}</td>
            <td class="table-cell">
              <span class="badge" :class="getRoleBadge(u.role)">{{ u.role }}</span>
            </td>
            <td class="table-cell">
              <span class="badge" :class="u.is_active ? 'badge-active' : 'badge-inactive'">
                {{ u.is_active ? 'ACTIVE' : 'INACTIVE' }}
              </span>
            </td>
            <td class="table-cell text-slate-400">{{ formatDate(u.last_login_at) }}</td>
            <td class="table-cell text-right">
              <button
                v-if="authStore.isAdmin"
                @click="toggleActive(u)"
                class="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {{ u.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CREATE MODAL -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold">Tambah Pengguna Baru</h2>
        <form @submit.prevent="submitUser" class="space-y-3 text-xs">
          <div>
            <label class="form-label">Nama Lengkap *</label>
            <input v-model="form.name" required class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label">Email *</label>
            <input type="email" v-model="form.email" required class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label">Password *</label>
            <input type="password" v-model="form.password" required class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label">Role *</label>
            <select v-model="form.role" class="form-input text-xs">
              <option value="ADMINISTRATOR">ADMINISTRATOR</option>
              <option value="MANAGEMENT">MANAGEMENT</option>
              <option value="ENGINEER">ENGINEER</option>
              <option value="SALES">SALES</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showModal = false" class="btn-secondary text-xs">Batal</button>
            <button type="submit" class="btn-primary text-xs">Simpan Pengguna</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import api from '../../api/index.js'
import { Plus as PlusIcon } from 'lucide-vue-next'

const authStore = useAuthStore()
const users = ref([])
const showModal = ref(false)
const form = ref({ name: '', email: '', password: '', role: 'ENGINEER' })

function formatDate(val) {
  if (!val) return '-'
  return new Date(val).toLocaleString('id-ID')
}

function getRoleBadge(role) {
  if (role === 'ADMINISTRATOR') return 'badge-danger'
  if (role === 'MANAGEMENT') return 'badge-purple'
  if (role === 'ENGINEER') return 'badge-info'
  return 'badge-draft'
}

async function fetchUsers() {
  try {
    const res = await api.get('/users')
    users.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch users:', err)
  }
}

function openCreateModal() {
  form.value = { name: '', email: '', password: '', role: 'ENGINEER' }
  showModal.value = true
}

async function submitUser() {
  try {
    await api.post('/users', form.value)
    showModal.value = false
    fetchUsers()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal membuat pengguna')
  }
}

async function toggleActive(u) {
  try {
    await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
    fetchUsers()
  } catch (err) {
    alert('Gagal update status pengguna')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
