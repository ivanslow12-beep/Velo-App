<template>
  <div class="space-y-6">
    <!-- Header with Title & Primary Action -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Document Templates</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kelola template dokumen BAST dan ACC.</p>
      </div>
      <button
        @click="openCreateModal"
        class="btn-primary self-start sm:self-auto"
      >
        <PlusIcon class="w-4 h-4" />
        <span>Create Template</span>
      </button>
    </div>

    <!-- Filters & Type Tabs -->
    <div class="card p-4 space-y-3">
      <!-- Tabs for Document Type: All | BAST | ACC -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
          <button
            v-for="t in [
              { label: 'All Templates', val: '' },
              { label: 'BAST Templates', val: 'BAST' },
              { label: 'ACC Templates', val: 'ACC' }
            ]"
            :key="t.val"
            @click="filterType = t.val; fetchTemplates()"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filterType === t.val
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            ]"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Default Templates quick indicator -->
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Default BAST: <strong class="text-slate-800 dark:text-slate-200">{{ defaultBastName }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5 text-slate-500">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Default ACC: <strong class="text-slate-800 dark:text-slate-200">{{ defaultAccName }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Filter Controls: Search & Status -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <input
            v-model="searchQuery"
            @input="debounceSearch"
            type="text"
            placeholder="Cari nama atau kode template..."
            class="form-input text-xs"
          />
        </div>
        <div>
          <select v-model="filterStatus" @change="fetchTemplates" class="form-input text-xs">
            <option value="">Semua Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive / Archived</option>
          </select>
        </div>
        <div class="flex items-center justify-end">
          <span class="text-xs text-slate-400">Total: <strong>{{ pagination.total }}</strong> template</span>
        </div>
      </div>
    </div>

    <!-- Templates List Table -->
    <div class="card overflow-visible">
      <div class="overflow-x-auto min-h-[300px]">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header">Template Name</th>
              <th class="table-header">Document Type</th>
              <th class="table-header">Template Code</th>
              <th class="table-header">Version</th>
              <th class="table-header">Status</th>
              <th class="table-header">Default</th>
              <th class="table-header">Effective Date</th>
              <th class="table-header">Updated By</th>
              <th class="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="table-cell text-center py-10 text-slate-400">
                Memuat template dokumen...
              </td>
            </tr>
            <tr v-else-if="!templates.length">
              <td colspan="9" class="table-cell text-center py-10 text-slate-400">
                Tidak ada template dokumen ditemukan
              </td>
            </tr>
            <tr
              v-for="tmpl in templates"
              :key="tmpl.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <!-- Name & Description -->
              <td class="table-cell">
                <div class="font-bold text-slate-900 dark:text-white">{{ tmpl.name }}</div>
                <div class="text-[11px] text-slate-400 truncate max-w-xs">{{ tmpl.description || '-' }}</div>
              </td>

              <!-- Document Type Badge -->
              <td class="table-cell">
                <span
                  class="badge"
                  :class="tmpl.document_type === 'BAST' ? 'badge-info' : 'badge-purple'"
                >
                  {{ tmpl.document_type }}
                </span>
              </td>

              <!-- Template Code -->
              <td class="table-cell font-mono text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                {{ tmpl.code }}
              </td>

              <!-- Version -->
              <td class="table-cell">
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    v{{ currentVersion(tmpl)?.version || '1.0' }}
                  </span>
                  <span
                    class="text-[9px] px-1 py-0.2 rounded font-bold uppercase"
                    :class="getVersionBadgeClass(currentVersion(tmpl)?.status)"
                  >
                    {{ currentVersion(tmpl)?.status || 'DRAFT' }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="table-cell">
                <span
                  class="badge"
                  :class="tmpl.is_active ? 'badge-active' : 'badge-inactive'"
                >
                  {{ tmpl.is_active ? 'ACTIVE' : 'INACTIVE' }}
                </span>
              </td>

              <!-- Default Badge -->
              <td class="table-cell">
                <span
                  v-if="tmpl.is_default"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  ★ YES
                </span>
                <span v-else class="text-slate-400 text-xs">NO</span>
              </td>

              <!-- Effective Date -->
              <td class="table-cell text-[11px] text-slate-500">
                {{ formatDate(tmpl.effective_from) || '-' }}
              </td>

              <!-- Updated By / Date -->
              <td class="table-cell text-[11px]">
                <div class="text-slate-800 dark:text-slate-200 font-medium">{{ tmpl.updatedByUser?.name || tmpl.createdByUser?.name || 'System' }}</div>
                <div class="text-slate-400 text-[10px]">{{ formatDate(tmpl.updated_at) }}</div>
              </td>

              <!-- Action Menu (⋮ Button) -->
              <td class="table-cell text-right relative">
                <div class="inline-block text-left">
                  <button
                    @click="toggleActionMenu(tmpl.id)"
                    class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 transition"
                    title="Menu Aksi"
                  >
                    <MoreVerticalIcon class="w-4 h-4" />
                  </button>

                  <!-- Popover Dropdown -->
                  <div
                    v-if="openMenuId === tmpl.id"
                    v-click-outside="closeActionMenu"
                    class="absolute right-4 mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-left text-xs divide-y divide-slate-100 dark:divide-slate-700/60"
                  >
                    <div class="py-1">
                      <button
                        @click="openEditor(tmpl)"
                        class="dropdown-item text-slate-700 dark:text-slate-200"
                      >
                        <EditIcon class="w-3.5 h-3.5 text-blue-500" />
                        <span>Edit Template</span>
                      </button>

                      <button
                        @click="openPreview(tmpl)"
                        class="dropdown-item text-slate-700 dark:text-slate-200"
                      >
                        <EyeIcon class="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview Document</span>
                      </button>
                    </div>

                    <div class="py-1">
                      <button
                        @click="openNewVersionModal(tmpl)"
                        class="dropdown-item text-slate-700 dark:text-slate-200"
                      >
                        <GitBranchIcon class="w-3.5 h-3.5 text-indigo-500" />
                        <span>Create New Version</span>
                      </button>

                      <button
                        @click="openDuplicateModal(tmpl)"
                        class="dropdown-item text-slate-700 dark:text-slate-200"
                      >
                        <CopyIcon class="w-3.5 h-3.5 text-emerald-500" />
                        <span>Duplicate Template</span>
                      </button>

                      <button
                        v-if="!tmpl.is_default && tmpl.is_active"
                        @click="handleSetDefault(tmpl)"
                        class="dropdown-item text-slate-700 dark:text-slate-200"
                      >
                        <StarIcon class="w-3.5 h-3.5 text-amber-500" />
                        <span>Set as Default</span>
                      </button>
                    </div>

                    <div class="py-1">
                      <button
                        v-if="currentVersion(tmpl)?.status === 'DRAFT' || currentVersion(tmpl)?.status === 'INACTIVE'"
                        @click="handleActivateVersion(tmpl)"
                        class="dropdown-item text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircleIcon class="w-3.5 h-3.5" />
                        <span>Activate Version</span>
                      </button>

                      <button
                        v-if="currentVersion(tmpl)?.status === 'ACTIVE'"
                        @click="handleDeactivateVersion(tmpl)"
                        class="dropdown-item text-amber-600 dark:text-amber-400"
                      >
                        <XCircleIcon class="w-3.5 h-3.5" />
                        <span>Deactivate Version</span>
                      </button>

                      <button
                        v-if="!tmpl.is_default"
                        @click="handleArchive(tmpl)"
                        class="dropdown-item text-rose-600 dark:text-rose-400"
                      >
                        <ArchiveIcon class="w-3.5 h-3.5" />
                        <span>Archive Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CREATE TEMPLATE MODAL -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div class="card max-w-lg w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Create New Document Template</h2>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 text-lg">×</button>
        </div>

        <form @submit.prevent="submitCreateTemplate" class="space-y-3">
          <div>
            <label class="form-label">Document Type *</label>
            <div class="grid grid-cols-2 gap-3">
              <label
                :class="[
                  'p-3 rounded-lg border text-center cursor-pointer font-bold text-xs transition',
                  createForm.document_type === 'BAST'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700'
                ]"
              >
                <input type="radio" value="BAST" v-model="createForm.document_type" class="sr-only" />
                <span>BAST</span>
                <span class="block text-[10px] font-normal text-slate-400 mt-0.5">Berita Acara Serah Terima</span>
              </label>

              <label
                :class="[
                  'p-3 rounded-lg border text-center cursor-pointer font-bold text-xs transition',
                  createForm.document_type === 'ACC'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700'
                ]"
              >
                <input type="radio" value="ACC" v-model="createForm.document_type" class="sr-only" />
                <span>ACC</span>
                <span class="block text-[10px] font-normal text-slate-400 mt-0.5">Activation Closing Confirm</span>
              </label>
            </div>
          </div>

          <div>
            <label class="form-label">Template Name *</label>
            <input
              v-model="createForm.name"
              required
              placeholder="e.g. BAST Installation Standard"
              class="form-input text-xs"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Template Code *</label>
              <input
                v-model="createForm.code"
                required
                placeholder="e.g. BAST-INSTALLATION"
                class="form-input text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label class="form-label">Initial Version</label>
              <input
                v-model="createForm.version"
                placeholder="1.0"
                class="form-input text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label class="form-label">Description</label>
            <textarea
              v-model="createForm.description"
              rows="2"
              placeholder="Keterangan peruntukan template..."
              class="form-input text-xs"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Effective Date (Optional)</label>
              <input
                type="date"
                v-model="createForm.effective_from"
                class="form-input text-xs"
              />
            </div>
            <div>
              <label class="form-label">Initial Status</label>
              <div class="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs font-bold text-amber-600">
                DRAFT (Default)
              </div>
            </div>
          </div>

          <div v-if="createError" class="text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/30 p-2.5 rounded-lg border border-rose-200">
            {{ createError }}
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button type="button" @click="showCreateModal = false" class="btn-secondary">
              Batal
            </button>
            <button type="submit" :disabled="submitting" class="btn-primary">
              {{ submitting ? 'Membuat...' : 'Buat Template & Buka Editor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- DUPLICATE MODAL -->
    <div
      v-if="showDuplicateModal"
      class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">Duplicate Template</h2>
        <p class="text-xs text-slate-500">Salin template <strong class="text-blue-600">{{ targetTemplate?.name }}</strong> menjadi template baru dengan status DRAFT.</p>

        <form @submit.prevent="submitDuplicate" class="space-y-3">
          <div>
            <label class="form-label">New Template Name *</label>
            <input v-model="duplicateForm.name" required class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label">New Template Code *</label>
            <input v-model="duplicateForm.code" required class="form-input text-xs font-mono uppercase" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showDuplicateModal = false" class="btn-secondary">Batal</button>
            <button type="submit" class="btn-primary">Duplikasi Template</button>
          </div>
        </form>
      </div>
    </div>

    <!-- CREATE NEW VERSION MODAL -->
    <div
      v-if="showNewVersionModal"
      class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">Create New Version</h2>
        <p class="text-xs text-slate-500">
          Template aktif <strong class="text-blue-600">{{ targetTemplate?.name }}</strong> tidak dapat diedit langsung. Buat versi baru berstatus DRAFT.
        </p>

        <form @submit.prevent="submitNewVersion" class="space-y-3">
          <div>
            <label class="form-label">Version Number *</label>
            <input
              v-model="newVersionForm.version"
              required
              placeholder="e.g. 1.1 or 2.0"
              class="form-input text-xs font-mono"
            />
          </div>
          <p class="text-[11px] text-slate-400">Konten akan diduplikasi dari versi aktif saat ini.</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showNewVersionModal = false" class="btn-secondary">Batal</button>
            <button type="submit" class="btn-primary">Buat Versi DRAFT</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/index.js'
import {
  Plus as PlusIcon,
  MoreVertical as MoreVerticalIcon,
  Edit as EditIcon,
  Eye as EyeIcon,
  Copy as CopyIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Archive as ArchiveIcon,
  GitBranch as GitBranchIcon,
} from 'lucide-vue-next'

const router = useRouter()

const templates = ref([])
const loading = ref(false)
const filterType = ref('')
const filterStatus = ref('')
const searchQuery = ref('')
const pagination = ref({ total: 0, page: 1, limit: 20 })

const openMenuId = ref(null)

const showCreateModal = ref(false)
const submitting = ref(false)
const createError = ref('')
const createForm = ref({
  document_type: 'BAST',
  name: '',
  code: '',
  version: '1.0',
  description: '',
  effective_from: '',
})

const showDuplicateModal = ref(false)
const targetTemplate = ref(null)
const duplicateForm = ref({ name: '', code: '' })

const showNewVersionModal = ref(false)
const newVersionForm = ref({ version: '' })

let searchTimeout = null
function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchTemplates()
  }, 300)
}

const defaultBastName = computed(() => {
  const t = templates.value.find((x) => x.document_type === 'BAST' && x.is_default)
  return t ? t.name : 'Belum diatur'
})

const defaultAccName = computed(() => {
  const t = templates.value.find((x) => x.document_type === 'ACC' && x.is_default)
  return t ? t.name : 'Belum diatur'
})

function currentVersion(tmpl) {
  if (!tmpl?.versions?.length) return null
  return tmpl.versions.find((v) => v.is_current) || tmpl.versions[0]
}

function getVersionBadgeClass(status) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (status === 'DRAFT') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  if (status === 'ARCHIVED') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

function formatDate(val) {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function toggleActionMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeActionMenu() {
  openMenuId.value = null
}

async function fetchTemplates() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }
    if (filterType.value) params.document_type = filterType.value
    if (filterStatus.value !== '') params.is_active = filterStatus.value
    if (searchQuery.value) params.search = searchQuery.value

    const res = await api.get('/document-templates', { params })
    templates.value = res.data.data
    if (res.data.pagination) {
      pagination.value = res.data.pagination
    }
  } catch (err) {
    console.error('Failed to fetch templates:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  createError.value = ''
  createForm.value = {
    document_type: filterType.value || 'BAST',
    name: '',
    code: '',
    version: '1.0',
    description: '',
    effective_from: '',
  }
  showCreateModal.value = true
}

async function submitCreateTemplate() {
  createError.value = ''
  submitting.value = true
  try {
    const res = await api.post('/document-templates', createForm.value)
    showCreateModal.value = false
    const newTmpl = res.data.data
    router.push(`/administration/document-templates/${newTmpl.id}/edit`)
  } catch (err) {
    createError.value = err.response?.data?.message || 'Gagal membuat template'
  } finally {
    submitting.value = false
  }
}

function openEditor(tmpl) {
  closeActionMenu()
  const v = currentVersion(tmpl)
  if (v && v.status !== 'ACTIVE') {
    router.push(`/administration/document-templates/${tmpl.id}/versions/${v.id}/edit`)
  } else {
    router.push(`/administration/document-templates/${tmpl.id}/edit`)
  }
}

function openPreview(tmpl) {
  closeActionMenu()
  const v = currentVersion(tmpl)
  router.push({
    path: `/administration/document-templates/${tmpl.id}/edit`,
    query: { tab: 'preview', versionId: v?.id },
  })
}

function openDuplicateModal(tmpl) {
  closeActionMenu()
  targetTemplate.value = tmpl
  duplicateForm.value = {
    name: `${tmpl.name} (Copy)`,
    code: `${tmpl.code}-COPY`,
  }
  showDuplicateModal.value = true
}

async function submitDuplicate() {
  try {
    await api.post(`/document-templates/${targetTemplate.value.id}/duplicate`, duplicateForm.value)
    showDuplicateModal.value = false
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menduplikasi template')
  }
}

function openNewVersionModal(tmpl) {
  closeActionMenu()
  targetTemplate.value = tmpl
  const v = currentVersion(tmpl)
  const parts = (v?.version || '1.0').split('.')
  const nextMinor = parts.length > 1 ? `${parts[0]}.${parseInt(parts[1]) + 1}` : '1.1'
  newVersionForm.value = { version: nextMinor }
  showNewVersionModal.value = true
}

async function submitNewVersion() {
  try {
    const v = currentVersion(targetTemplate.value)
    const res = await api.post(`/document-templates/${targetTemplate.value.id}/versions`, {
      version: newVersionForm.value.version,
      base_version_id: v?.id,
    })
    showNewVersionModal.value = false
    router.push(`/administration/document-templates/${targetTemplate.value.id}/versions/${res.data.data.id}/edit`)
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal membuat versi baru')
  }
}

async function handleSetDefault(tmpl) {
  closeActionMenu()
  if (!confirm(`Jadikan "${tmpl.name}" sebagai template default untuk ${tmpl.document_type}?`)) return
  try {
    await api.post(`/document-templates/${tmpl.id}/set-default`)
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengubah default template')
  }
}

async function handleActivateVersion(tmpl) {
  closeActionMenu()
  const v = currentVersion(tmpl)
  if (!v) return
  if (!confirm(`Aktifkan versi v${v.version} untuk template "${tmpl.name}"?`)) return
  try {
    await api.post(`/document-templates/${tmpl.id}/versions/${v.id}/activate`)
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengaktifkan versi')
  }
}

async function handleDeactivateVersion(tmpl) {
  closeActionMenu()
  const v = currentVersion(tmpl)
  if (!v) return
  if (!confirm(`Nonaktifkan versi v${v.version}?`)) return
  try {
    await api.post(`/document-templates/${tmpl.id}/versions/${v.id}/deactivate`)
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menonaktifkan versi')
  }
}

async function handleArchive(tmpl) {
  closeActionMenu()
  if (!confirm(`Arsipkan template "${tmpl.name}"? Template tidak akan dapat digunakan untuk order baru.`)) return
  try {
    await api.post(`/document-templates/${tmpl.id}/archive`)
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengarsipkan template')
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.dropdown-item {
  @apply flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition text-left;
}
</style>
