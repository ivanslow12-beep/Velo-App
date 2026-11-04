<template>
  <div v-if="loading" class="py-20 text-center text-slate-400 text-xs">
    Memuat data BAST...
  </div>
  <div v-else-if="bast" class="space-y-6">
    <!-- Topbar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <router-link :to="`/iwo/${bast.iwo_id}`" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <ArrowLeftIcon class="w-4 h-4" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-mono font-bold text-slate-900 dark:text-white">{{ bast.bast_no }}</h1>
            <span class="badge" :class="getStatusBadgeClass(bast.status)">{{ bast.status }}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">IWO: {{ bast.iwo?.iwo_no }} • Pelanggan: {{ bast.iwo?.customer?.name }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button @click="openPreview" class="btn-secondary text-xs">
          <EyeIcon class="w-3.5 h-3.5 text-blue-500" />
          <span>Preview Document</span>
        </button>

        <button
          v-if="bast.status === 'DRAFT'"
          @click="submitApproval"
          class="btn-secondary text-xs"
        >
          <span>Submit for Approval</span>
        </button>

        <button
          v-if="['APPROVED', 'DRAFT', 'GENERATED'].includes(bast.status)"
          @click="generateDocument"
          :disabled="generating"
          class="btn-primary text-xs bg-purple-600 hover:bg-purple-700"
        >
          <FileTextIcon class="w-3.5 h-3.5" />
          <span>{{ generating ? 'Generating...' : 'Generate Versioned PDF' }}</span>
        </button>

        <a
          v-if="bast.generated_document_path"
          :href="`/api/v1/attachments/${attachmentId}/download`"
          target="_blank"
          class="btn-secondary text-xs text-emerald-600"
        >
          <DownloadIcon class="w-3.5 h-3.5" />
          <span>Unduh PDF (v{{ bast.generated_document_version }})</span>
        </a>
      </div>
    </div>

    <!-- Template Selection Banner -->
    <div class="card p-4 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-xs font-bold text-purple-900 dark:text-purple-300">Template Dokumen BAST Yang Digunakan:</span>
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
          <span class="text-[11px] font-mono text-purple-700 dark:text-purple-400">
            Versi Aktif: <strong>v{{ activeVersionString }}</strong>
          </span>
        </div>
      </div>

      <div v-if="bast.generated_at" class="text-right text-[11px] text-slate-500">
        <div>Digenerate pada: <strong>{{ formatDate(bast.generated_at) }}</strong></div>
        <div>Menggunakan versi template: <strong class="font-mono text-purple-600">v{{ bast.generated_document_version }}</strong></div>
      </div>
    </div>

    <!-- Approvals List & Customer Info -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Approvals Workflow -->
      <div class="card p-5 space-y-4 md:col-span-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Approval Workflow</h2>
        <div class="divide-y divide-slate-100 dark:divide-slate-700/60">
          <div
            v-for="appr in (bast.approvals || [])"
            :key="appr.id"
            class="py-3 flex items-center justify-between text-xs"
          >
            <div>
              <div class="font-bold text-slate-800 dark:text-slate-200">{{ appr.role }}</div>
              <div class="text-[11px] text-slate-400">
                Approver: {{ appr.approver?.name || '-' }} • Status:
                <strong :class="appr.status === 'APPROVED' ? 'text-emerald-600' : appr.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-500'">
                  {{ appr.status }}
                </strong>
              </div>
            </div>

            <div v-if="appr.status === 'PENDING'" class="flex items-center gap-1.5">
              <button
                @click="reviewApproval(appr.id, 'APPROVED')"
                class="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-semibold"
              >
                Approve
              </button>
              <button
                @click="reviewApproval(appr.id, 'REJECTED')"
                class="px-2.5 py-1 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs font-semibold"
              >
                Reject
              </button>
            </div>
            <div v-else class="text-[11px] font-bold text-slate-500">
              {{ appr.status }}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Summary -->
      <div class="card p-5 space-y-3 text-xs">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Dokumen</h2>
        <div>
          <span class="text-slate-400 block text-[11px]">Tanggal Aktif</span>
          <span class="font-bold">{{ bast.active_date }}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">No. IWO Terkait</span>
          <span class="font-mono text-blue-600">{{ bast.iwo?.iwo_no }}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">Pelanggan</span>
          <span class="font-semibold">{{ bast.iwo?.customer?.name }}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">Catatan BAST</span>
          <p class="text-slate-600 dark:text-slate-300 mt-0.5">{{ bast.notes || '-' }}</p>
        </div>
      </div>
    </div>

    <!-- PREVIEW MODAL -->
    <div v-if="showPreviewModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-4xl w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b pb-2">
          <h2 class="text-sm font-bold">Preview Dokumen BAST Real Data</h2>
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
  Download as DownloadIcon,
} from 'lucide-vue-next'

const route = useRoute()
const bast = ref(null)
const loading = ref(false)
const generating = ref(false)
const templates = ref([])
const selectedTemplateId = ref('')
const showPreviewModal = ref(false)
const previewHtml = ref('')
const attachmentId = ref('')

function getStatusBadgeClass(st) {
  if (st === 'GENERATED' || st === 'APPROVED') return 'badge-active'
  if (st === 'PENDING_APPROVAL') return 'badge-draft'
  if (st === 'REJECTED') return 'badge-danger'
  return 'badge-inactive'
}

function formatDate(val) {
  if (!val) return '-'
  return new Date(val).toLocaleString('id-ID')
}

const activeVersionString = computed(() => {
  const t = templates.value.find((x) => x.id === selectedTemplateId.value)
  const v = t?.versions?.find((ver) => ver.status === 'ACTIVE') || t?.versions?.[0]
  return v ? v.version : '1.0'
})

async function loadBast() {
  loading.value = true
  try {
    const res = await api.get(`/bast/${route.params.id}`)
    bast.value = res.data.data
    selectedTemplateId.value = bast.value.document_template_id || ''
  } catch (err) {
    console.error('Failed to load BAST:', err)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await api.get('/document-templates', { params: { document_type: 'BAST', is_active: 'true' } })
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
    await api.patch(`/bast/${bast.value.id}`, { document_template_id: selectedTemplateId.value })
    await loadBast()
  } catch (err) {
    alert('Gagal update template')
  }
}

async function submitApproval() {
  try {
    await api.post(`/bast/${bast.value.id}/submit-approval`)
    await loadBast()
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal submit approval')
  }
}

async function reviewApproval(approvalId, status) {
  try {
    await api.patch(`/bast/${bast.value.id}/approval/${approvalId}`, { status })
    await loadBast()
  } catch (err) {
    alert('Gagal submit review')
  }
}

async function openPreview() {
  try {
    const res = await api.post(`/bast/${bast.value.id}/preview`)
    previewHtml.value = res.data.data.html
    showPreviewModal.value = true
  } catch (err) {
    alert('Gagal membuat preview: ' + (err.response?.data?.message || err.message))
  }
}

async function generateDocument() {
  generating.value = true
  try {
    const res = await api.post(`/bast/${bast.value.id}/generate`)
    attachmentId.value = res.data.data.attachment_id
    alert(`BAST PDF berhasil digenerate menggunakan template versi v${res.data.data.template_version}!`)
    await loadBast()
  } catch (err) {
    alert('Gagal generate: ' + (err.response?.data?.message || err.message))
  } finally {
    generating.value = false
  }
}

onMounted(async () => {
  await loadBast()
  await loadTemplates()
})
</script>
