<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">Internal Work Orders (IWO)</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kelola tiket provisioning pelanggan dari intake, survei, instalasi hingga BAST & ACC.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          ref="importFileInput"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="hidden"
          @change="selectImportFile"
        />
        <button
          type="button"
          @click="importFileInput?.click()"
          :disabled="importing"
          class="btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs px-3 py-2"
        >
          <UploadIcon class="w-4 h-4" />
          <span>Pilih File</span>
        </button>
        <button
          v-if="importFile"
          type="button"
          @click="importIwos"
          :disabled="importing"
          class="btn-primary self-start sm:self-auto flex items-center gap-2 text-xs px-3 py-2"
        >
          <UploadIcon class="w-4 h-4" />
          <span>{{ importing ? 'Mengimpor...' : 'Import IWO' }}</span>
        </button>
        <a
          href="/iwo-template.csv"
          download
          title="Unduh contoh CSV; hapus baris contoh sebelum mengisi data"
          class="btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs px-3 py-2"
        >
          <DownloadIcon class="w-4 h-4" />
          <span>Template CSV</span>
        </a>
        <div class="flex items-center gap-2">
          <select v-model="exportFormat" class="form-input text-xs py-2" aria-label="Format ekspor IWO">
            <option value="csv">CSV</option>
            <option value="xlsx">Excel (.xlsx)</option>
          </select>
          <button
            type="button"
            @click="exportIwos"
            :disabled="exporting"
            class="btn-secondary flex items-center gap-2 text-xs px-3 py-2"
          >
            <DownloadIcon class="w-4 h-4" />
            <span>{{ exporting ? 'Mengekspor...' : 'Ekspor' }}</span>
          </button>
        </div>
        <router-link to="/iwo/create" class="btn-primary self-start sm:self-auto flex items-center gap-2 shadow-sm text-xs px-4 py-2">
          <PlusIcon class="w-4 h-4" />
          <span>Buat IWO Baru</span>
        </router-link>
      </div>
    </div>

    <div v-if="importFile" class="text-xs text-slate-500 dark:text-slate-400">
      File dipilih: <strong class="text-slate-700 dark:text-slate-200">{{ importFile.name }}</strong>
      <span> · Maksimal 5 MB, 500 baris</span>
    </div>

    <div
      v-if="importResult"
      class="p-4 text-xs rounded-xl border shadow-sm"
      :class="importResult.failed
        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'"
    >
      <div class="font-semibold">
        {{ importResult.created }} dari {{ importResult.total }} IWO berhasil diimpor.
        <span v-if="importResult.failed"> {{ importResult.failed }} baris gagal.</span>
      </div>
      <ul v-if="importResult.errors.length" class="mt-2 space-y-1 list-disc list-inside">
        <li v-for="item in importResult.errors.slice(0, 10)" :key="`${item.row}-${item.message}`">
          Baris {{ item.row }}: {{ item.message }}
        </li>
      </ul>
      <p v-if="importResult.errors.length > 10" class="mt-1">
        Dan {{ importResult.errors.length - 10 }} kesalahan lainnya.
      </p>
    </div>

    <!-- Alert / Toast Banner -->
    <div v-if="toastMsg" class="p-4 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-2">
        <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
        <span>{{ toastMsg }}</span>
      </div>
      <button @click="toastMsg = ''" class="text-emerald-500 hover:text-emerald-700">✕</button>
    </div>

    <!-- Filters & Tabs -->
    <div class="card p-4 space-y-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm">
      <!-- Tabs (Active / Archived / All) -->
      <div class="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
        <div class="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-700/60 text-xs font-semibold">
          <button
            type="button"
            @click="setTab('active')"
            :class="activeTab === 'active' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-md transition"
          >
            IWO Aktif
          </button>
          <button
            type="button"
            @click="setTab('archived')"
            :class="activeTab === 'archived' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5"
          >
            <ArchiveIcon class="w-3.5 h-3.5" />
            <span>Diarsipkan</span>
          </button>
          <button
            type="button"
            @click="setTab('all')"
            :class="activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'"
            class="px-3.5 py-1.5 rounded-md transition"
          >
            Semua IWO
          </button>
        </div>

        <span class="text-xs text-slate-400">Total: <strong>{{ iwos.length }}</strong> data</span>
      </div>

      <!-- Search & Status Selectors -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-2">
          <input
            v-model="search"
            @input="debounceSearch"
            placeholder="Cari No. IWO, pelanggan, layanan, mitra, PIC..."
            class="form-input text-xs"
          />
        </div>
        <div>
          <select v-model="status" @change="fetchIwos" class="form-input text-xs">
            <option value="">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ACTIVATION">ACTIVATION</option>
            <option value="BAST">BAST</option>
            <option value="ACC">ACC</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div>
          <select v-model="priority" @change="fetchIwos" class="form-input text-xs">
            <option value="">Semua Prioritas</option>
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="card overflow-x-auto bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <th class="table-header py-3.5">No. IWO</th>
            <th class="table-header py-3.5">Pelanggan</th>
            <th class="table-header py-3.5">Layanan / PIC</th>
            <th class="table-header py-3.5">Tipe & Prioritas</th>
            <th class="table-header py-3.5">Status</th>
            <th class="table-header py-3.5">Progress</th>
            <th class="table-header py-3.5">Deadline RFS</th>
            <th class="table-header py-3.5 text-center min-w-[120px]">AKSI</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
          <tr v-if="loading">
            <td colspan="8" class="table-cell text-center py-12 text-slate-400">
              <span class="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mb-2 block mx-auto"></span>
              Memuat data IWO...
            </td>
          </tr>
          <tr v-else-if="!iwos.length">
            <td colspan="8" class="table-cell text-center py-12 text-slate-400">
              Tidak ada work order ditemukan pada filter ini.
            </td>
          </tr>
          <tr v-for="item in iwos" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
            <!-- No IWO -->
            <td class="table-cell font-mono font-bold text-blue-600 dark:text-blue-400">
              <router-link :to="`/iwo/${item.id}`" class="hover:underline flex items-center gap-1.5">
                <span>{{ item.iwo_no }}</span>
                <span v-if="item.is_archived" class="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 font-sans">
                  Arsip
                </span>
              </router-link>
            </td>

            <!-- Customer -->
            <td class="table-cell">
              <div class="font-semibold text-slate-900 dark:text-white">
                {{ item.customer_name_manual || item.customer?.name || '-' }}
              </div>
              <div v-if="item.customer_contact_person || item.customer_phone" class="text-[11px] text-slate-400">
                {{ item.customer_contact_person }} {{ item.customer_phone ? `(${item.customer_phone})` : '' }}
              </div>
            </td>

            <!-- Service & PIC -->
            <td class="table-cell">
              <div class="font-medium text-slate-700 dark:text-slate-300">
                {{ item.service_name_manual || item.service?.name || '-' }}
              </div>
              <div v-if="item.pic_project || item.sales_name_manual" class="text-[11px] text-slate-400">
                PIC: {{ item.pic_project || item.sales_name_manual || item.sales?.name || '-' }}
              </div>
            </td>

            <!-- Request Type & Priority -->
            <td class="table-cell text-[11px]">
              <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.request_type }}</div>
              <span class="text-[10px] font-bold uppercase tracking-wider" :class="getPriorityClass(item.priority)">
                {{ item.priority }}
              </span>
            </td>

            <!-- Status -->
            <td class="table-cell">
              <span class="badge" :class="getStatusBadge(item.status)">{{ item.status }}</span>
            </td>

            <!-- Progress -->
            <td class="table-cell">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full transition-all duration-300" :style="{ width: item.progress + '%' }"></div>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">{{ item.progress }}%</span>
              </div>
            </td>

            <!-- Deadline RFS -->
            <td class="table-cell text-[11px]" :class="{ 'text-rose-600 font-bold': item.is_overdue }">
              {{ item.deadline_rfs || '-' }}
              <span v-if="item.is_overdue" class="block text-[9px] text-rose-500 font-bold">OVERDUE</span>
            </td>

            <!-- Action Column (Icon titik tiga dengan trigger menu) -->
            <td class="table-cell text-center">
              <div class="flex items-center justify-center gap-1.5">
                <router-link
                  :to="`/iwo/${item.id}`"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  title="Lihat Detail"
                >
                  <EyeIcon class="w-4 h-4" />
                </router-link>

                <button
                  type="button"
                  @click.stop="openMenu($event, item)"
                  :class="openDropdownId === item.id ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'"
                  class="p-1.5 rounded-lg transition"
                  title="Menu Aksi Lainnya"
                >
                  <MoreVerticalIcon class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Teleported Floating Action Menu (Never clipped by table overflow or z-index) -->
    <Teleport to="body">
      <div
        v-if="openDropdownId && selectedRowIwo"
        @click.stop
        :style="{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }"
        class="fixed z-[99999] w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 text-xs text-slate-700 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in zoom-in-95 duration-100"
      >
        <div class="px-3 py-1.5 text-[10px] font-mono text-slate-400 border-b border-slate-100 dark:border-slate-700/60 truncate">
          {{ selectedRowIwo.iwo_no }}
        </div>

        <div class="py-1">
          <router-link
            :to="`/iwo/${selectedRowIwo.id}`"
            @click="closeMenu"
            class="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <EyeIcon class="w-3.5 h-3.5 text-slate-400" />
            <span>Lihat Detail</span>
          </router-link>
          <router-link
            :to="`/iwo/${selectedRowIwo.id}/edit`"
            @click="closeMenu"
            class="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-blue-600 dark:text-blue-400 font-medium transition"
          >
            <EditIcon class="w-3.5 h-3.5" />
            <span>Edit IWO</span>
          </router-link>
        </div>

        <div class="py-1">
          <button
            type="button"
            @click="triggerArchiveFromMenu"
            class="w-full text-left flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-purple-600 dark:text-purple-400 transition"
          >
            <ArchiveIcon class="w-3.5 h-3.5" />
            <span>{{ selectedRowIwo.is_archived ? 'Buka Arsip' : 'Arsipkan IWO' }}</span>
          </button>

          <button
            type="button"
            @click="triggerDeleteFromMenu"
            class="w-full text-left flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition"
          >
            <Trash2Icon class="w-3.5 h-3.5" />
            <span>Hapus IWO</span>
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal Konfirmasi Hapus (Delete) -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      @click.self="showDeleteModal = false"
    >
      <div class="card max-w-md w-full p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl space-y-4">
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangleIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Hapus IWO</h3>
            <p class="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Apakah Anda yakin ingin menghapus Work Order nomor:
          <strong class="font-mono text-slate-900 dark:text-white block mt-1 p-2 rounded bg-slate-100 dark:bg-slate-700/60">
            {{ targetIwo?.iwo_no }}
          </strong>
          Semua data milestone, informasi jaringan, dan riwayat terkait IWO ini akan dihapus dari sistem.
        </p>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            @click="showDeleteModal = false"
            class="btn-secondary text-xs px-4 py-2"
          >
            Batal
          </button>
          <button
            type="button"
            @click="confirmDelete"
            :disabled="actionLoading"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
          >
            {{ actionLoading ? 'Menghapus...' : 'Ya, Hapus IWO' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Arsip (Archive) -->
    <div
      v-if="showArchiveModal"
      class="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      @click.self="showArchiveModal = false"
    >
      <div class="card max-w-md w-full p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl space-y-4">
        <div class="flex items-center gap-3 text-purple-600 dark:text-purple-400">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center flex-shrink-0">
            <ArchiveIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              {{ targetIwo?.is_archived ? 'Pulihkan IWO dari Arsip' : 'Arsipkan IWO' }}
            </h3>
            <p class="text-xs text-slate-500">Ubah status arsip work order.</p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {{
            targetIwo?.is_archived
              ? `Kembalikan IWO ${targetIwo?.iwo_no} ke daftar IWO aktif?`
              : `Arsipkan IWO ${targetIwo?.iwo_no}? IWO akan dipindahkan dari daftar aktif ke tab arsip.`
          }}
        </p>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            @click="showArchiveModal = false"
            class="btn-secondary text-xs px-4 py-2"
          >
            Batal
          </button>
          <button
            type="button"
            @click="confirmArchive"
            :disabled="actionLoading"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm"
          >
            {{ actionLoading ? 'Memproses...' : (targetIwo?.is_archived ? 'Ya, Pulihkan' : 'Ya, Arsipkan') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api/index.js'
import {
  Plus as PlusIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  MoreVertical as MoreVerticalIcon,
  Eye as EyeIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Trash2 as Trash2Icon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
} from 'lucide-vue-next'

const route = useRoute()
const iwos = ref([])
const loading = ref(false)
const search = ref('')
const status = ref(route.query.status || '')
const priority = ref('')
const activeTab = ref('active') // 'active' | 'archived' | 'all'

const openDropdownId = ref(null)
const selectedRowIwo = ref(null)
const targetIwo = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

const showDeleteModal = ref(false)
const showArchiveModal = ref(false)
const actionLoading = ref(false)
const toastMsg = ref('')
const exportFormat = ref('csv')
const exporting = ref(false)
const importFileInput = ref(null)
const importFile = ref(null)
const importing = ref(false)
const importResult = ref(null)

let searchTimer = null
function debounceSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchIwos, 300)
}

function setTab(tab) {
  activeTab.value = tab
  closeMenu()
  fetchIwos()
}

function openMenu(event, item) {
  if (openDropdownId.value === item.id) {
    closeMenu()
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  // Calculate fixed floating position
  const menuWidth = 192 // 12rem / w-48
  let leftPos = rect.right - menuWidth
  if (leftPos < 10) leftPos = 10
  if (leftPos + menuWidth > window.innerWidth - 10) {
    leftPos = window.innerWidth - menuWidth - 10
  }

  // Check if opening downwards would overflow bottom of viewport
  let topPos = rect.bottom + 6
  if (topPos + 180 > window.innerHeight) {
    topPos = Math.max(10, rect.top - 180)
  }

  menuPosition.value = { top: topPos, left: leftPos }
  selectedRowIwo.value = item
  openDropdownId.value = item.id
}

function closeMenu() {
  openDropdownId.value = null
}

function triggerDeleteFromMenu() {
  targetIwo.value = selectedRowIwo.value
  closeMenu()
  showDeleteModal.value = true
}

function triggerArchiveFromMenu() {
  targetIwo.value = selectedRowIwo.value
  closeMenu()
  showArchiveModal.value = true
}

async function confirmDelete() {
  if (!targetIwo.value) return
  actionLoading.value = true
  try {
    const res = await api.delete(`/iwo/${targetIwo.value.id}`)
    showDeleteModal.value = false
    toastMsg.value = res.data?.message || `IWO ${targetIwo.value.iwo_no} berhasil dihapus.`
    fetchIwos()
  } catch (err) {
    alert('Gagal menghapus IWO: ' + (err.response?.data?.message || err.message))
  } finally {
    actionLoading.value = false
  }
}

async function confirmArchive() {
  if (!targetIwo.value) return
  actionLoading.value = true
  const newState = !targetIwo.value.is_archived
  try {
    const res = await api.patch(`/iwo/${targetIwo.value.id}/archive`, { is_archived: newState })
    showArchiveModal.value = false
    toastMsg.value = res.data?.message || (newState ? 'IWO berhasil diarsipkan' : 'IWO berhasil dipulihkan dari arsip')
    fetchIwos()
  } catch (err) {
    alert('Gagal mengubah status arsip: ' + (err.response?.data?.message || err.message))
  } finally {
    actionLoading.value = false
  }
}

function getPriorityClass(p) {
  if (p === 'CRITICAL') return 'text-rose-600 dark:text-rose-400'
  if (p === 'HIGH') return 'text-amber-600 dark:text-amber-400'
  if (p === 'LOW') return 'text-slate-400'
  return 'text-blue-600 dark:text-blue-400'
}

function getStatusBadge(st) {
  if (st === 'COMPLETED') return 'badge-active'
  if (st === 'PENDING') return 'badge-draft'
  if (st === 'IN_PROGRESS' || st === 'ACTIVATION') return 'badge-info'
  if (st === 'BAST' || st === 'ACC') return 'badge-purple'
  if (st === 'ARCHIVED') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
  return 'badge-inactive'
}

function selectImportFile(event) {
  const [file] = event.target.files || []
  importResult.value = null
  if (!file) return

  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    alert('Pilih file dengan format CSV atau Excel (.xlsx).')
    event.target.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5 MB.')
    event.target.value = ''
    return
  }
  importFile.value = file
  event.target.value = ''
}

async function importIwos() {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const response = await api.post('/iwo/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = response.data.data
    importFile.value = null
    if (importFileInput.value) importFileInput.value.value = ''
    await fetchIwos()
  } catch (err) {
    const message = err.response?.data?.message || err.message
    alert('Gagal mengimpor IWO: ' + message)
  } finally {
    importing.value = false
  }
}

async function exportIwos() {
  exporting.value = true
  try {
    const params = { format: exportFormat.value }
    if (search.value) params.search = search.value
    if (status.value) params.status = status.value
    if (priority.value) params.priority = priority.value
    if (route.query.is_overdue) params.is_overdue = 'true'
    params.archived = activeTab.value === 'all' ? 'all' : activeTab.value === 'archived' ? 'true' : 'false'

    const response = await api.get('/iwo/export', { params, responseType: 'blob' })
    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `iwo-export-${new Date().toISOString().slice(0, 10)}.${exportFormat.value}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    alert('Gagal mengekspor IWO: ' + (err.response?.data?.message || err.message))
  } finally {
    exporting.value = false
  }
}

async function fetchIwos() {
  loading.value = true
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (status.value) params.status = status.value
    if (priority.value) params.priority = priority.value
    if (route.query.is_overdue) params.is_overdue = 'true'

    params.archived = activeTab.value === 'all' ? 'all' : activeTab.value === 'archived' ? 'true' : 'false'

    const res = await api.get('/iwo', { params })
    iwos.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch IWOs:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchIwos()
  window.addEventListener('click', closeMenu)
  window.addEventListener('scroll', closeMenu, true)
  window.addEventListener('resize', closeMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu)
  window.removeEventListener('scroll', closeMenu, true)
  window.removeEventListener('resize', closeMenu)
})
</script>
