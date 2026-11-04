<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <router-link :to="`/iwo/${route.params.id}`" class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ArrowLeftIcon class="w-5 h-5" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">Edit Internal Work Order</h1>
            <span class="font-mono text-sm px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
              {{ form.iwo_no || 'Memuat...' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Perbarui spesifikasi, kontak pelanggan, mitra, status, dan target SLA IWO.</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      <span class="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mb-2 block mx-auto"></span>
      Memuat data IWO...
    </div>

    <!-- Error Banner -->
    <div v-if="errorMsg" class="p-4 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl flex items-center gap-3">
      <AlertTriangleIcon class="w-5 h-5 flex-shrink-0" />
      <span>{{ errorMsg }}</span>
    </div>

    <form v-if="!loading" @submit.prevent="updateIwo" class="space-y-6">
      <!-- Section 1: Dokumen, Status & Prioritas -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <FileTextIcon class="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">1. Dokumen, Status & Prioritas</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Nomor IWO -->
          <div>
            <label class="form-label">Nomor IWO *</label>
            <input
              v-model="form.iwo_no"
              class="form-input text-xs font-mono font-bold"
              placeholder="Nomor IWO..."
              required
            />
          </div>

          <!-- Request Type -->
          <div>
            <label class="form-label">Tipe Permintaan *</label>
            <select v-model="form.request_type" required class="form-input text-xs">
              <option value="NEW_INSTALLATION">NEW INSTALLATION</option>
              <option value="UPGRADE">UPGRADE</option>
              <option value="DOWNGRADE">DOWNGRADE</option>
              <option value="RELOCATION">RELOCATION</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="TERMINATION">TERMINATION</option>
            </select>
          </div>

          <!-- Priority -->
          <div>
            <label class="form-label">Prioritas Tiket *</label>
            <select v-model="form.priority" class="form-input text-xs">
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <!-- Status -->
          <div>
            <label class="form-label">Status IWO *</label>
            <select v-model="form.status" class="form-input text-xs">
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="ACTIVATION">ACTIVATION</option>
              <option value="BAST">BAST</option>
              <option value="ACC">ACC</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 2: Data Pelanggan & Kontak (Full Manual) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <BuildingIcon class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">2. Data Pelanggan & Kontak</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Pelanggan -->
          <div class="md:col-span-2">
            <label class="form-label">Nama Pelanggan *</label>
            <input
              v-model="form.customer_name_manual"
              placeholder="Nama perusahaan / pelanggan..."
              class="form-input text-xs font-semibold"
              required
            />
          </div>

          <!-- Contact Person -->
          <div>
            <label class="form-label">Contact Person (PIC Pelanggan)</label>
            <input
              v-model="form.customer_contact_person"
              placeholder="Nama PIC pelanggan..."
              class="form-input text-xs"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="form-label">No. Telepon / WA Pelanggan</label>
            <input
              v-model="form.customer_phone"
              placeholder="Contoh: 0812-3456-7890"
              class="form-input text-xs"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="form-label">Email Pelanggan</label>
            <input
              type="email"
              v-model="form.customer_email"
              placeholder="email@pelanggan.com"
              class="form-input text-xs"
            />
          </div>

          <!-- Alamat -->
          <div>
            <label class="form-label">Alamat Lokasi Instalasi</label>
            <input
              v-model="form.customer_address_manual"
              placeholder="Alamat gedung / lantai / ruangan..."
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Layanan, PIC Project & Mitra (Full Manual) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <LayersIcon class="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">3. Layanan, PIC Project & Mitra</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Layanan -->
          <div class="md:col-span-2">
            <label class="form-label">Layanan / Paket Service *</label>
            <input
              v-model="form.service_name_manual"
              placeholder="Nama paket layanan..."
              class="form-input text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label class="form-label">Tarif Layanan (Rp)</label>
            <input
              v-model.number="form.service_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Contoh: 1500000"
              class="form-input text-xs"
            />
          </div>

          <!-- PIC Project -->
          <div>
            <label class="form-label">PIC Project</label>
            <input
              v-model="form.pic_project"
              placeholder="Nama PIC proyek..."
              class="form-input text-xs"
            />
          </div>

          <!-- POP / Standalone -->
          <div>
            <label class="form-label">POP / Standalone</label>
            <input
              v-model="form.pop_or_standalone"
              placeholder="Contoh: POP Cyber 1 / Standalone..."
              class="form-input text-xs"
            />
          </div>

          <!-- Partner 1 -->
          <div>
            <label class="form-label">Partner 1</label>
            <input
              v-model="form.partner_1"
              placeholder="Mitra / Subkon 1..."
              class="form-input text-xs"
            />
          </div>

          <!-- Partner 2 -->
          <div>
            <label class="form-label">Partner 2</label>
            <input
              v-model="form.partner_2"
              placeholder="Mitra / Subkon 2..."
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Tim Sales & Target SLA (Full Manual) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <BriefcaseIcon class="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">4. Tim Sales & Jadwal SLA</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Sales -->
          <div>
            <label class="form-label">Nama Sales</label>
            <input
              v-model="form.sales_name_manual"
              placeholder="Nama Sales / Account Manager..."
              class="form-input text-xs"
            />
          </div>

          <!-- Industry Sales -->
          <div>
            <label class="form-label">Industry Sales</label>
            <input
              v-model="form.industry_sales"
              placeholder="Contoh: Banking, ISP, Hospitality..."
              class="form-input text-xs"
            />
          </div>

          <!-- SLA Days -->
          <div>
            <label class="form-label">Target SLA (Hari Kerja)</label>
            <input
              type="number"
              v-model.number="form.sla_days"
              min="1"
              max="365"
              class="form-input text-xs"
            />
          </div>

          <!-- Deadline RFS -->
          <div>
            <label class="form-label">Deadline RFS (Ready For Service)</label>
            <input
              type="date"
              v-model="form.deadline_rfs"
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 5: Catatan -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <MessageSquareIcon class="w-4 h-4 text-slate-500" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">5. Catatan Order</h2>
        </div>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Instruksi survei atau catatan khusus..."
          class="form-input text-xs"
        ></textarea>
      </div>

      <!-- Submit Actions -->
      <div class="flex items-center justify-between pt-4">
        <router-link :to="`/iwo/${route.params.id}`" class="btn-secondary text-xs px-5 py-2.5">
          Batal
        </router-link>
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-sm"
        >
          <CheckIcon v-if="!submitting" class="w-4 h-4" />
          <span v-else class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          <span>{{ submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan IWO' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../api/index.js'
import {
  ArrowLeft as ArrowLeftIcon,
  FileText as FileTextIcon,
  Building as BuildingIcon,
  Layers as LayersIcon,
  Briefcase as BriefcaseIcon,
  MessageSquare as MessageSquareIcon,
  AlertTriangle as AlertTriangleIcon,
  Check as CheckIcon,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')

const form = ref({
  iwo_no: '',
  request_type: 'NEW_INSTALLATION',
  priority: 'NORMAL',
  status: 'PENDING',
  // Customer (Full Manual)
  customer_name_manual: '',
  customer_contact_person: '',
  customer_phone: '',
  customer_email: '',
  customer_address_manual: '',
  // Service (Full Manual)
  service_name_manual: '',
  service_price: null,
  // Sales (Full Manual)
  sales_name_manual: '',
  industry_sales: '',
  // Project & Partners (Full Manual)
  pic_project: '',
  partner_1: '',
  partner_2: '',
  pop_or_standalone: '',
  // SLA & Notes
  deadline_rfs: '',
  sla_days: 14,
  notes: '',
})

async function loadData() {
  loading.value = true
  try {
    const res = await api.get(`/iwo/${route.params.id}`)
    const current = res.data.data
    form.value = {
      iwo_no: current.iwo_no || '',
      request_type: current.request_type || 'NEW_INSTALLATION',
      priority: current.priority || 'NORMAL',
      status: current.status || 'PENDING',
      customer_name_manual: current.customer_name_manual || current.customer?.name || '',
      customer_contact_person: current.customer_contact_person || current.customer?.contact_name || '',
      customer_phone: current.customer_phone || current.customer?.phone || '',
      customer_email: current.customer_email || current.customer?.email || '',
      customer_address_manual: current.customer_address_manual || current.customer?.address || '',
      service_name_manual: current.service_name_manual || current.service?.name || '',
      service_price: current.service_price ?? current.service?.price ?? '',
      sales_name_manual: current.sales_name_manual || current.sales?.name || '',
      industry_sales: current.industry_sales || '',
      pic_project: current.pic_project || '',
      partner_1: current.partner_1 || '',
      partner_2: current.partner_2 || '',
      pop_or_standalone: current.pop_or_standalone || '',
      deadline_rfs: current.deadline_rfs || '',
      sla_days: current.sla_days || 14,
      notes: current.notes || '',
    }
  } catch (err) {
    errorMsg.value = 'Gagal memuat data IWO: ' + (err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

async function updateIwo() {
  submitting.value = true
  errorMsg.value = ''

  if (!form.value.iwo_no?.trim()) {
    errorMsg.value = 'Nomor IWO wajib diisi.'
    submitting.value = false
    return
  }
  if (!form.value.customer_name_manual?.trim()) {
    errorMsg.value = 'Nama pelanggan wajib diisi.'
    submitting.value = false
    return
  }
  if (!form.value.service_name_manual?.trim()) {
    errorMsg.value = 'Nama paket layanan wajib diisi.'
    submitting.value = false
    return
  }

  const payload = {
    ...form.value,
    iwo_no: form.value.iwo_no.trim(),
    customer_name_manual: form.value.customer_name_manual.trim(),
    service_name_manual: form.value.service_name_manual.trim(),
    sales_name_manual: form.value.sales_name_manual?.trim() || null,
  }

  try {
    await api.put(`/iwo/${route.params.id}`, payload)
    router.push(`/iwo/${route.params.id}`)
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Gagal menyimpan perubahan IWO.'
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>
