<template>
  <div v-if="loading" class="py-20 text-center text-slate-400 text-xs">
    Memuat data ACC...
  </div>
  <div v-else-if="acc" class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <router-link :to="`/iwo/${acc.iwo_id}`" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <ArrowLeftIcon class="w-4 h-4" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-mono font-bold text-slate-900 dark:text-white">{{ acc.subscription_number }}</h1>
            <span class="badge" :class="getStatusBadgeClass(acc.status)">{{ acc.status }}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">IWO: {{ acc.iwo?.iwo_no }} • Pelanggan: {{ acc.iwo?.customer?.name }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button @click="openPreview" class="btn-secondary text-xs">
          <EyeIcon class="w-3.5 h-3.5 text-blue-500" />
          <span>Preview Document</span>
        </button>

        <button
          @click="generateDocument"
          :disabled="generating"
          class="btn-primary text-xs bg-indigo-600 hover:bg-indigo-700"
        >
          <FileTextIcon class="w-3.5 h-3.5" />
          <span>{{ generating ? 'Generating...' : 'Generate ACC PDF' }}</span>
        </button>

        <button
          v-if="acc.status === 'DRAFT' || acc.status === 'SENT'"
          @click="sendCustomerEmail"
          class="btn-secondary text-xs text-blue-600"
        >
          <MailIcon class="w-3.5 h-3.5" />
          <span>Kirim Email Pelanggan</span>
        </button>

        <!-- Customer approval simulation button -->
        <button
          v-if="acc.customer_signature_token && acc.status === 'SENT'"
          @click="simulateCustomerApproval"
          class="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircleIcon class="w-3.5 h-3.5" />
          <span>Simulasi Approval Pelanggan</span>
        </button>
      </div>
    </div>

    <!-- Template Selection Banner -->
    <div class="card p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-xs font-bold text-indigo-900 dark:text-indigo-300">Template Dokumen ACC Yang Digunakan:</span>
        <div class="flex items-center gap-2">
          <select
            v-model="selectedTemplateId"
            @change="updateSelectedTemplate"
            class="form-input text-xs w-72 bg-white dark:bg-slate-800"
          >
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.code }}) {{ t.is_default ? '★ DEFAULT' : '' }}
            </option>
          </select>
          <span class="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
            Versi Aktif: <strong>v{{ activeVersionString }}</strong>
          </span>
        </div>
      </div>

      <div v-if="acc.generated_at" class="text-right text-[11px] text-slate-500">
        <div>Digenerate pada: <strong>{{ formatDate(acc.generated_at) }}</strong></div>
        <div>Menggunakan versi template: <strong class="font-mono text-indigo-600">v{{ acc.generated_document_version }}</strong></div>
      </div>
    </div>

    <!-- ACC Information & Equipment -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- General & Billing Info -->
      <div class="card p-5 space-y-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Kontrak & Billing</h2>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span class="text-slate-400 block text-[11px]">No. Subscription</span>
            <span class="font-bold font-mono">{{ acc.subscription_number }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">No. Kontrak</span>
            <span class="font-mono">{{ acc.contract_number || '-' }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Tanggal Aktivasi</span>
            <span class="font-medium">{{ acc.activation_date }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Mulai Billing</span>
            <span class="font-medium">{{ acc.start_billing_date }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Tarif Bulanan</span>
            <span class="font-bold text-emerald-600">{{ formatRupiah(acc.monthly_tariff) }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Periode Kontrak</span>
            <span>{{ acc.contract_period }} Bulan</span>
          </div>
        </div>
      </div>

      <!-- Equipment Table -->
      <div class="card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Peralatan Diserahkan (Equipment)</h2>
          <button @click="addEquipment" class="btn-secondary text-xs py-1 px-2.5">+ Tambah</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr>
                <th class="table-header">Peralatan</th>
                <th class="table-header">Serial No</th>
                <th class="table-header">Qty</th>
                <th class="table-header"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!acc.equipment?.length">
                <td colspan="4" class="table-cell text-center text-slate-400 py-6">Belum ada equipment terdaftar</td>
              </tr>
              <tr v-for="eq in (acc.equipment || [])" :key="eq.id">
                <td class="table-cell font-medium">{{ eq.name }}</td>
                <td class="table-cell font-mono">{{ eq.serial_number || '-' }}</td>
                <td class="table-cell">{{ eq.quantity }}</td>
                <td class="table-cell text-right">
                  <button @click="deleteEquipment(eq.id)" class="text-rose-500 hover:text-rose-700">×</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Requirements & Criteria Table -->
    <div class="card p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">
          Kriteria Kelayakan & Uji Terima (Requirements & Criteria)
        </h2>
        <button @click="addRequirement" class="btn-secondary text-xs py-1 px-2.5">+ Tambah Kriteria</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr>
              <th class="table-header" style="width: 50%;">Kriteria / Syarat</th>
              <th class="table-header" style="width: 15%;">Hasil</th>
              <th class="table-header" style="width: 35%;">Catatan / Evidence</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!acc.requirements?.length">
              <td colspan="3" class="table-cell text-center text-slate-400 py-6">Belum ada kriteria uji terima</td>
            </tr>
            <tr v-for="req in (acc.requirements || [])" :key="req.id">
              <td class="table-cell font-medium">{{ req.requirement }}</td>
              <td class="table-cell">
                <select
                  :value="req.result"
                  @change="updateRequirementResult(req.id, $event.target.value)"
                  class="form-input text-xs py-1"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="NA">N/A</option>
                </select>
              </td>
              <td class="table-cell text-slate-500">{{ req.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PREVIEW MODAL -->
    <div v-if="showPreviewModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-4xl w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b pb-2">
          <h2 class="text-sm font-bold">Preview Dokumen ACC Real Data</h2>
          <button @click="showPreviewModal = false" class="text-slate-400 text-xl font-bold">×</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 bg-slate-50 rounded border" v-html="previewHtml"></div>
        <div class="flex justify-end pt-2">
          <button @click="showPreviewModal = false" class="btn-primary text-xs">Tutup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api/index.js'
import {
  ArrowLeft as ArrowLeftIcon,
  Eye as EyeIcon,
  FileText as FileTextIcon,
  Mail as MailIcon,
  CheckCircle as CheckCircleIcon,
} from 'lucide-vue-next'

const route = useRoute()
const acc = ref(null)
const loading = ref(false)
const generating = ref(false)
const templates = ref([])
const selectedTemplateId = ref('')
const showPreviewModal = ref(false)
const previewHtml = ref('')

function getStatusBadgeClass(st) {
  if (st === 'CUSTOMER_APPROVED' || st === 'COMPLETED') return 'badge-active'
  if (st === 'SENT') return 'badge-info'
  if (st === 'DRAFT') return 'badge-draft'
  return 'badge-inactive'
}

function formatDate(val) {
  if (!val) return '-'
  return new Date(val).toLocaleString('id-ID')
}

function formatRupiah(val) {
  if (!val) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
}

const activeVersionString = computed(() => {
  const t = templates.value.find((x) => x.id === selectedTemplateId.value)
  const v = t?.versions?.find((ver) => ver.status === 'ACTIVE') || t?.versions?.[0]
  return v ? v.version : '1.0'
})

async function loadAcc() {
  loading.value = true
  try {
    const res = await api.get(`/acc/${route.params.id}`)
    acc.value = res.data.data
    selectedTemplateId.value = acc.value.document_template_id || ''
  } catch (err) {
    console.error('Failed to load ACC:', err)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await api.get('/document-templates', { params: { document_type: 'ACC', is_active: 'true' } })
    templates.value = res.data.data
    if (!selectedTemplateId.value) {
      const def = templates.value.find((t) => t.is_default) || templates.value[0]
      if (def) selectedTemplateId.value = def.id
    }
  } catch (err) {
    console.error('Failed to load templates:', err)
  }
}

async function updateSelectedTemplate() {
  try {
    await api.patch(`/acc/${acc.value.id}`, { document_template_id: selectedTemplateId.value })
    await loadAcc()
  } catch (err) {
    alert('Gagal update template')
  }
}

function addEquipment() {
  const name = prompt('Nama Peralatan:')
  if (!name) return
  const serial = prompt('Serial Number:') || ''
  api.post(`/acc/${acc.value.id}/equipment`, { name, serial_number: serial, quantity: 1 }).then(loadAcc)
}

function deleteEquipment(id) {
  if (confirm('Hapus equipment ini?')) {
    api.delete(`/acc/${acc.value.id}/equipment/${id}`).then(loadAcc)
  }
}

function addRequirement() {
  const req = prompt('Kriteria Pengujian:')
  if (!req) return
  api.post(`/acc/${acc.value.id}/requirements`, { requirement: req, result: 'YES' }).then(loadAcc)
}

async function updateRequirementResult(reqId, result) {
  try {
    await api.patch(`/acc/${acc.value.id}/requirements/${reqId}`, { result })
    await loadAcc()
  } catch (err) {
    alert('Gagal update kriteria')
  }
}

async function openPreview() {
  try {
    const res = await api.post(`/acc/${acc.value.id}/preview`)
    previewHtml.value = res.data.data.html
    showPreviewModal.value = true
  } catch (err) {
    alert('Gagal membuat preview: ' + (err.response?.data?.message || err.message))
  }
}

async function generateDocument() {
  generating.value = true
  try {
    const res = await api.post(`/acc/${acc.value.id}/generate`)
    alert(`ACC PDF berhasil digenerate menggunakan template versi v${res.data.data.template_version}!`)
    await loadAcc()
  } catch (err) {
    alert('Gagal generate: ' + (err.response?.data?.message || err.message))
  } finally {
    generating.value = false
  }
}

async function sendCustomerEmail() {
  try {
    const res = await api.post(`/acc/${acc.value.id}/send-email`)
    alert('Email ACC berhasil dikirim ke pelanggan! Token persetujuan telah digenerate.')
    await loadAcc()
  } catch (err) {
    alert('Gagal kirim email: ' + (err.response?.data?.message || err.message))
  }
}

async function simulateCustomerApproval() {
  if (!confirm('Simulasikan pelanggan mengklik persetujuan ACC via link email? IWO akan otomatis COMPLETED.')) return
  try {
    await api.post(`/acc/approve/${acc.value.customer_signature_token}`)
    alert('Pelanggan telah menyetujui ACC! IWO sekarang COMPLETED.')
    await loadAcc()
  } catch (err) {
    alert('Gagal simulasi persetujuan: ' + (err.response?.data?.message || err.message))
  }
}

onMounted(async () => {
  await loadAcc()
  await loadTemplates()
})
</script>
