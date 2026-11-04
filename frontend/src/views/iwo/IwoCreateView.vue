<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <router-link to="/iwo" class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
        <ArrowLeftIcon class="w-5 h-5" />
      </router-link>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">Buat Internal Work Order Baru</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">Pengisian form provisioning IWO lengkap dengan input manual mandiri.</p>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="errorMsg" class="p-4 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl flex items-center gap-3">
      <AlertTriangleIcon class="w-5 h-5 flex-shrink-0" />
      <span>{{ errorMsg }}</span>
    </div>

    <form @submit.prevent="submitIwo" class="space-y-6">
      <!-- Section 1: Dokumen & Identitas IWO -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <FileTextIcon class="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">1. Dokumen & Identitas IWO</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Nomor IWO (Full Manual Text Input) -->
          <div>
            <label class="form-label">Nomor IWO *</label>
            <input
              v-model="form.iwo_no"
              type="text"
              placeholder="Contoh: 000125/VELO/IWO/XI/26"
              class="form-input text-xs font-mono font-bold"
              required
            />
            <span class="text-[10px] text-slate-400 mt-1 block">Input manual nomor IWO resmi.</span>
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
              <option value="LOW">LOW (Rendah)</option>
              <option value="NORMAL">NORMAL (Standar)</option>
              <option value="HIGH">HIGH (Tinggi)</option>
              <option value="CRITICAL">CRITICAL (Mendesak)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 2: Data Pelanggan & Kontak (Full Manual Input) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <BuildingIcon class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">2. Data Pelanggan & Kontak</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Pelanggan (Text Input Manual) -->
          <div class="md:col-span-2">
            <label class="form-label">Nama Pelanggan (Perusahaan / Entitas) *</label>
            <input
              v-model="form.customer_name_manual"
              type="text"
              placeholder="Ketik nama lengkap perusahaan atau pelanggan..."
              class="form-input text-xs font-semibold"
              required
            />
          </div>

          <!-- Contact Person -->
          <div>
            <label class="form-label">Contact Person (PIC Pelanggan)</label>
            <input
              v-model="form.customer_contact_person"
              type="text"
              placeholder="Nama penanggung jawab / PIC pelanggan..."
              class="form-input text-xs"
            />
          </div>

          <!-- No. Telepon / WA -->
          <div>
            <label class="form-label">No. Telepon / WhatsApp Customer</label>
            <input
              v-model="form.customer_phone"
              type="text"
              placeholder="Contoh: 0812-3456-7890 / 021-5551234"
              class="form-input text-xs"
            />
          </div>

          <!-- Email Customer -->
          <div>
            <label class="form-label">Email Customer</label>
            <input
              type="email"
              v-model="form.customer_email"
              placeholder="pic@perusahaan.co.id"
              class="form-input text-xs"
            />
          </div>

          <!-- Alamat Lokasi Instalasi -->
          <div>
            <label class="form-label">Alamat Lokasi Instalasi</label>
            <input
              v-model="form.customer_address_manual"
              type="text"
              placeholder="Gedung, lantai, ruangan, atau alamat instalasi..."
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Layanan, PIC Project & Mitra (Full Manual Input) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <LayersIcon class="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">3. Layanan, PIC Project & Mitra</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Layanan / Paket Service (Text Input Manual) -->
          <div class="md:col-span-2">
            <label class="form-label">Layanan / Paket Service *</label>
            <input
              v-model="form.service_name_manual"
              type="text"
              placeholder="Contoh: Dedicated Internet Access 100 Mbps 1:1 Simetris..."
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
              type="text"
              placeholder="Nama penanggung jawab teknis / proyek..."
              class="form-input text-xs"
            />
          </div>

          <!-- POP / Standalone -->
          <div>
            <label class="form-label">POP / Standalone</label>
            <input
              v-model="form.pop_or_standalone"
              type="text"
              placeholder="Contoh: POP Cyber 1 / POP Menara / Standalone..."
              class="form-input text-xs"
            />
          </div>

          <!-- Partner 1 -->
          <div>
            <label class="form-label">Partner 1</label>
            <input
              v-model="form.partner_1"
              type="text"
              placeholder="Nama mitra / subkon 1 (jika ada)..."
              class="form-input text-xs"
            />
          </div>

          <!-- Partner 2 -->
          <div>
            <label class="form-label">Partner 2</label>
            <input
              v-model="form.partner_2"
              type="text"
              placeholder="Nama mitra / subkon 2 (jika ada)..."
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Tim Sales & Target SLA (Full Manual Input) -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <BriefcaseIcon class="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">4. Tim Sales & Jadwal SLA</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Nama Sales (Text Input Manual) -->
          <div>
            <label class="form-label">Nama Sales</label>
            <input
              v-model="form.sales_name_manual"
              type="text"
              placeholder="Nama Account Manager / Sales PIC..."
              class="form-input text-xs"
            />
          </div>

          <!-- Industry Sales -->
          <div>
            <label class="form-label">Industry Sales</label>
            <input
              v-model="form.industry_sales"
              type="text"
              placeholder="Contoh: Banking & Finance, Telco/ISP, Hospitality, Enterprise..."
              class="form-input text-xs"
            />
          </div>

          <!-- Target SLA (Hari) -->
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
            <label class="form-label">Deadline RFS (Ready For Service) *</label>
            <input
              type="date"
              v-model="form.deadline_rfs"
              required
              class="form-input text-xs"
            />
          </div>
        </div>
      </div>

      <!-- Section 5: Catatan Khusus -->
      <div class="card p-6 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <MessageSquareIcon class="w-4 h-4 text-slate-500" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">5. Catatan Order / Kebutuhan Khusus</h2>
        </div>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Instruksi survei, informasi topologi, perangkat tambahan, atau kebutuhan khusus lainnya..."
          class="form-input text-xs"
        ></textarea>
      </div>

      <!-- Submit Actions -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <router-link to="/iwo" class="btn-secondary text-xs px-5 py-2.5">
          Batal
        </router-link>
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 shadow-sm"
        >
          <CheckIcon v-if="!submitting" class="w-4 h-4" />
          <span v-else class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          <span>{{ submitting ? 'Menyimpan IWO...' : 'Simpan & Buat IWO' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()
const submitting = ref(false)
const errorMsg = ref('')

const form = ref({
  iwo_no: '',
  request_type: 'NEW_INSTALLATION',
  priority: 'NORMAL',
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

async function submitIwo() {
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
    const res = await api.post('/iwo', payload)
    router.push(`/iwo/${res.data.data.id}`)
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Gagal membuat IWO. Pastikan Nomor IWO unik dan semua data wajib telah diisi.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // Default deadline: 14 days ahead
  const d = new Date()
  d.setDate(d.getDate() + 14)
  form.value.deadline_rfs = d.toISOString().split('T')[0]
})
</script>
