<template>
  <div class="h-[calc(100vh-6rem)] flex flex-col -m-4 lg:-m-6 bg-slate-100 dark:bg-slate-900 overflow-hidden">
    <!-- EDITOR TOPBAR HEADER -->
    <div class="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 px-4 flex items-center justify-between shrink-0 shadow-xs">
      <!-- Left Info -->
      <div class="flex items-center gap-3">
        <router-link
          to="/administration/document-templates"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Kembali ke Daftar Template"
        >
          <ArrowLeftIcon class="w-4 h-4" />
        </router-link>

        <div class="flex items-center gap-2">
          <span class="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs">
            {{ template?.name || 'Template Designer' }}
          </span>
          <span
            class="badge text-[10px]"
            :class="template?.document_type === 'BAST' ? 'badge-info' : 'badge-purple'"
          >
            {{ template?.document_type }}
          </span>
          <span class="text-xs font-mono font-bold text-slate-500">
            v{{ currentVer?.version || '1.0' }}
          </span>
          <span
            class="badge text-[10px]"
            :class="getStatusBadgeClass(currentVer?.status)"
          >
            {{ currentVer?.status || 'DRAFT' }}
          </span>
        </div>

        <!-- Saved / Unsaved indicator -->
        <div class="hidden sm:flex items-center gap-1.5 text-[11px] ml-4 text-slate-400">
          <span
            class="w-2 h-2 rounded-full"
            :class="hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
          ></span>
          <span>{{ hasUnsavedChanges ? 'Unsaved changes' : 'Saved' }}</span>
        </div>
      </div>

      <!-- Right Top Actions -->
      <div class="flex items-center gap-2">
        <button
          v-if="currentVer?.status === 'DRAFT'"
          @click="saveDraft"
          :disabled="saving"
          class="btn-secondary text-xs py-1.5"
        >
          <SaveIcon class="w-3.5 h-3.5 text-slate-500" />
          <span>{{ saving ? 'Saving...' : 'Save Draft' }}</span>
        </button>

        <button
          @click="openValidationModal"
          class="btn-secondary text-xs py-1.5"
        >
          <CheckSquareIcon class="w-3.5 h-3.5 text-blue-500" />
          <span>Validate</span>
        </button>

        <button
          @click="togglePreview"
          class="btn-secondary text-xs py-1.5"
          :class="{ 'bg-blue-50 dark:bg-blue-900/30 text-blue-600': showPreviewTab }"
        >
          <EyeIcon class="w-3.5 h-3.5 text-indigo-500" />
          <span>{{ showPreviewTab ? 'Design Mode' : 'Preview' }}</span>
        </button>

        <button
          v-if="currentVer?.status === 'DRAFT'"
          @click="handleActivate"
          class="btn-primary text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircleIcon class="w-3.5 h-3.5" />
          <span>Activate</span>
        </button>

        <button
          v-else-if="currentVer?.status === 'ACTIVE'"
          @click="handleNewVersionFromActive"
          class="btn-primary text-xs py-1.5 bg-blue-600 hover:bg-blue-700"
        >
          <GitBranchIcon class="w-3.5 h-3.5" />
          <span>Create New Version</span>
        </button>
      </div>
    </div>

    <!-- PREVIEW VIEW -->
    <div v-if="showPreviewTab" class="flex-1 flex flex-col p-4 overflow-y-auto">
      <div class="max-w-4xl w-full mx-auto space-y-4">
        <!-- Preview Control Bar -->
        <div class="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-800">
          <div class="flex items-center gap-3">
            <span class="font-bold text-slate-700 dark:text-slate-300">Data Source:</span>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" :value="true" v-model="useSampleData" @change="loadPreview" />
              <span>Sample Preview Data</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" :value="false" v-model="useSampleData" @change="loadPreview" />
              <span>Real Record</span>
            </label>
            <input
              v-if="!useSampleData"
              v-model="previewEntityId"
              placeholder="Masukkan ID / No IWO..."
              class="form-input text-xs w-48 py-1"
              @change="loadPreview"
            />
          </div>

          <div class="flex items-center gap-2">
            <button @click="printPreview" class="btn-secondary py-1 text-xs">
              <PrinterIcon class="w-3.5 h-3.5" />
              <span>Print / Download</span>
            </button>
            <button @click="showPreviewTab = false" class="btn-secondary py-1 text-xs">
              <span>Tutup Preview</span>
            </button>
          </div>
        </div>

        <!-- Rendered Document Sheet Container -->
        <div class="card p-8 bg-white shadow-lg min-h-[700px] border border-slate-300">
          <div v-if="previewLoading" class="py-20 text-center text-slate-400 text-xs">
            Merender dokumen preview...
          </div>
          <div v-else v-html="previewHtml"></div>
        </div>
      </div>
    </div>

    <!-- 3-COLUMN EDITOR CANVAS -->
    <div v-else class="flex-1 flex min-h-0 overflow-hidden">
      <!-- LEFT COLUMN: Template Components -->
      <div class="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 flex flex-col shrink-0 overflow-y-auto p-3 space-y-4">
        <div>
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Basic Components
          </h3>
          <div class="space-y-1.5">
            <button @click="addComponent('heading')" class="comp-btn">
              <HeadingIcon class="w-4 h-4 text-blue-500" />
              <span>Heading</span>
            </button>
            <button @click="addComponent('paragraph')" class="comp-btn">
              <PilcrowIcon class="w-4 h-4 text-slate-500" />
              <span>Paragraph</span>
            </button>
            <button @click="addComponent('field_pair')" class="comp-btn">
              <TagIcon class="w-4 h-4 text-emerald-500" />
              <span>Label + Value</span>
            </button>
            <button @click="addComponent('divider')" class="comp-btn">
              <MinusIcon class="w-4 h-4 text-slate-400" />
              <span>Divider Line</span>
            </button>
          </div>
        </div>

        <!-- Document Type Specific Components -->
        <div>
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            {{ template?.document_type }} Blocks
          </h3>
          <div class="space-y-1.5">
            <!-- Dynamic Device Table -->
            <button @click="addComponent('dynamic_table')" class="comp-btn">
              <TableIcon class="w-4 h-4 text-indigo-500" />
              <span>Dynamic {{ template?.document_type === 'ACC' ? 'Equipment' : 'Device' }} Table</span>
            </button>

            <!-- ACC Requirements Table -->
            <button
              v-if="template?.document_type === 'ACC'"
              @click="addComponent('requirements_table')"
              class="comp-btn"
            >
              <CheckSquareIcon class="w-4 h-4 text-emerald-500" />
              <span>Requirements & Criteria</span>
            </button>

            <!-- Approval Block -->
            <button @click="addComponent('approval_block')" class="comp-btn">
              <FileSignatureIcon class="w-4 h-4 text-purple-500" />
              <span>Internal Approvals Block</span>
            </button>

            <!-- Customer Approval Block -->
            <button
              v-if="template?.document_type === 'ACC'"
              @click="addComponent('customer_approval_block')"
              class="comp-btn"
            >
              <PenToolIcon class="w-4 h-4 text-amber-500" />
              <span>Customer Approval Box</span>
            </button>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
          💡 Klik komponen di atas untuk menambahkannya ke dokumen.
        </div>
      </div>

      <!-- CENTER COLUMN: Document Canvas -->
      <div class="flex-1 bg-slate-200/60 dark:bg-slate-900/80 overflow-y-auto p-6 flex justify-center">
        <div class="max-w-[760px] w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-300 dark:border-slate-700 min-h-[840px] p-8 flex flex-col space-y-4">
          <!-- Canvas Top Notice -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DOCUMENT CANVAS • {{ template?.document_type }}
            </span>
            <span class="text-[11px] text-slate-400">
              {{ schemaComponents.length }} Components
            </span>
          </div>

          <!-- Component Items Canvas List -->
          <div v-if="!schemaComponents.length" class="py-20 text-center text-slate-400 text-xs">
            Belum ada komponen dalam template ini. Tambahkan komponen dari panel kiri.
          </div>

          <div
            v-for="(comp, idx) in schemaComponents"
            :key="idx"
            @click="selectComponent(comp, idx)"
            :class="[
              'p-3.5 rounded-lg border transition-all cursor-pointer relative group',
              selectedCompIndex === idx
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-900/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            ]"
          >
            <!-- Component Type Badge & Reorder/Delete Toolbar -->
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {{ comp.type }}
              </span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  v-if="idx > 0"
                  @click.stop="moveComponent(idx, -1)"
                  class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700"
                  title="Move Up"
                >
                  <ArrowUpIcon class="w-3 h-3" />
                </button>
                <button
                  v-if="idx < schemaComponents.length - 1"
                  @click.stop="moveComponent(idx, 1)"
                  class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700"
                  title="Move Down"
                >
                  <ArrowDownIcon class="w-3 h-3" />
                </button>
                <button
                  @click.stop="deleteComponent(idx)"
                  class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  title="Delete"
                >
                  <TrashIcon class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Visual Rendering on Canvas -->
            <div v-if="comp.type === 'heading'" class="py-1">
              <h2 :class="comp.level === 1 ? 'text-lg font-bold' : comp.level === 2 ? 'text-base font-bold text-blue-600' : 'text-sm font-semibold'">
                {{ comp.text || 'Judul Heading...' }}
              </h2>
            </div>

            <div v-else-if="comp.type === 'paragraph'" class="py-1 text-xs text-slate-600 dark:text-slate-300">
              {{ comp.text || 'Teks paragraf deskripsi...' }}
            </div>

            <div v-else-if="comp.type === 'field_pair'" class="flex items-center text-xs py-1">
              <span class="w-36 font-medium text-slate-500">{{ comp.label || 'Label' }}</span>
              <span class="mr-2 text-slate-400">:</span>
              <span
                class="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                v-text="comp.value || '{placeholder}'"
              ></span>
            </div>

            <div v-else-if="comp.type === 'divider'" class="py-2">
              <hr class="border-t border-dashed border-slate-300 dark:border-slate-600" />
            </div>

            <div v-else-if="comp.type === 'dynamic_table'" class="py-2 text-xs">
              <div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dynamic Table: {{ comp.source || 'devices' }}
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 text-center text-slate-400">
                [ Dynamic {{ comp.source === 'equipments' ? 'Equipment' : 'Device' }} Rows Auto-Generated at Render Time ]
              </div>
            </div>

            <div v-else-if="comp.type === 'requirements_table'" class="py-2 text-xs">
              <div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Requirements & Criteria Table</div>
              <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 text-center text-slate-400">
                [ Dynamic Requirements Table (Requirement, Result YES/NO/NA, Evidence) ]
              </div>
            </div>

            <div v-else-if="comp.type === 'approval_block'" class="py-2 text-xs">
              <div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Internal Approvals Block</div>
              <div class="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div v-for="r in (comp.roles || ['ENGINEER', 'SALES', 'FULFILMENT', 'HEAD_OSS'])" :key="r" class="p-2 border rounded bg-slate-50 dark:bg-slate-900/60">
                  <div class="font-bold text-slate-500">{{ r }}</div>
                  <div class="mt-4 text-slate-400 font-mono" v-text="'(approval.' + r.toLowerCase() + '_name)'"></div>
                </div>
              </div>
            </div>

            <div v-else-if="comp.type === 'customer_approval_block'" class="py-2 text-xs">
              <div class="p-3 rounded border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-900/20 text-center">
                <span class="font-bold text-amber-800 dark:text-amber-200">Customer Sign-off Block</span>
                <p class="text-[11px] text-slate-500 mt-1">Blok tanda tangan penerimaan & persetujuan aktivasi pelanggan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Properties & Whitelisted Data Fields Catalog -->
      <div class="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/80 flex flex-col shrink-0 overflow-y-auto p-4 space-y-6">
        <!-- Section A: Properties of Selected Component -->
        <div>
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Component Properties
          </h3>

          <div v-if="selectedComponent" class="space-y-3 text-xs">
            <div v-if="selectedComponent.type === 'heading'">
              <label class="form-label">Heading Text</label>
              <input v-model="selectedComponent.text" @input="markUnsaved" class="form-input text-xs" />
              <label class="form-label mt-2">Level</label>
              <select v-model="selectedComponent.level" @change="markUnsaved" class="form-input text-xs">
                <option :value="1">H1 (Title)</option>
                <option :value="2">H2 (Subtitle)</option>
                <option :value="3">H3 (Section)</option>
              </select>
            </div>

            <div v-else-if="selectedComponent.type === 'paragraph'">
              <label class="form-label">Paragraph Text</label>
              <textarea v-model="selectedComponent.text" @input="markUnsaved" rows="3" class="form-input text-xs"></textarea>
            </div>

            <div v-else-if="selectedComponent.type === 'field_pair'">
              <label class="form-label">Field Label</label>
              <input v-model="selectedComponent.label" @input="markUnsaved" class="form-input text-xs" />
              <label class="form-label mt-2">Field Value / Placeholder</label>
              <input v-model="selectedComponent.value" @input="markUnsaved" class="form-input text-xs font-mono" />
              <p class="text-[10px] text-slate-400 mt-1">Klik placeholder di katalog bawah untuk langsung memasukkannya.</p>
            </div>

            <div v-else class="text-slate-400 text-xs">
              Komponen jenis <strong class="text-slate-700 dark:text-slate-300">{{ selectedComponent.type }}</strong> tidak memerlukan konfigurasi khusus.
            </div>
          </div>
          <div v-else class="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            Pilih komponen di canvas untuk mengubah propertinya.
          </div>
        </div>

        <!-- Section B: Searchable Whitelisted Placeholder Catalog -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Available Data Fields
            </h3>
            <span class="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">Whitelist</span>
          </div>

          <!-- Catalog Search Input -->
          <div class="mb-3">
            <input
              v-model="placeholderSearch"
              placeholder="Cari data field (e.g. customer)..."
              class="form-input text-xs py-1.5"
            />
          </div>

          <!-- Catalog Accordion / List Groups -->
          <div class="space-y-2 text-xs">
            <div
              v-for="(group, gKey) in filteredCatalog"
              :key="gKey"
              class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              <div
                @click="toggleGroup(gKey)"
                class="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition"
              >
                <span>{{ group.label }}</span>
                <span class="text-[10px] text-slate-400 font-mono">{{ group.fields.length }}</span>
              </div>

              <div v-if="openGroups[gKey]" class="p-2 space-y-1 bg-white dark:bg-slate-800">
                <button
                  v-for="field in group.fields"
                  :key="field.key"
                  @click="insertPlaceholder(field.key)"
                  class="w-full text-left p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 group transition flex items-center justify-between"
                  :title="`Klik untuk masukkan {{${field.key}}}`"
                >
                  <span class="font-medium text-slate-800 dark:text-slate-200 text-[11px]">{{ field.label }}</span>
                  <span
                    class="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold group-hover:underline"
                    v-text="formatPlaceholder(field.key)"
                  ></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VALIDATION MODAL -->
    <div
      v-if="showValidationModal"
      class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="validationResult.isValid ? 'bg-emerald-500' : 'bg-rose-500'"
            ></span>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Hasil Validasi Template</h2>
          </div>
          <button @click="showValidationModal = false" class="text-slate-400 hover:text-slate-600 text-lg">×</button>
        </div>

        <div v-if="validationResult.isValid" class="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs flex items-center gap-2">
          <CheckCircleIcon class="w-5 h-5 shrink-0" />
          <span>Semua placeholder valid dan terdaftar dalam whitelist aman! Template siap diaktifkan.</span>
        </div>

        <div v-else class="space-y-3">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
            Ditemukan placeholder yang tidak terdaftar dalam whitelist:
          </div>
          <ul class="space-y-2 text-xs">
            <li v-for="(err, idx) in validationResult.errors" :key="idx" class="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-700 font-mono text-rose-600 dark:text-rose-400">
              {{ err }}
            </li>
          </ul>
        </div>

        <div class="flex justify-end pt-2">
          <button @click="showValidationModal = false" class="btn-primary text-xs">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import api from '../../api/index.js'
import {
  ArrowLeft as ArrowLeftIcon,
  Save as SaveIcon,
  CheckSquare as CheckSquareIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  GitBranch as GitBranchIcon,
  Printer as PrinterIcon,
  Heading as HeadingIcon,
  Pilcrow as PilcrowIcon,
  Tag as TagIcon,
  Minus as MinusIcon,
  Table as TableIcon,
  FileSignature as FileSignatureIcon,
  PenTool as PenToolIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Trash as TrashIcon,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const template = ref(null)
const currentVer = ref(null)
const schemaComponents = ref([])

const saving = ref(false)
const hasUnsavedChanges = ref(false)

const selectedCompIndex = ref(-1)
const selectedComponent = computed(() => {
  if (selectedCompIndex.value >= 0 && selectedCompIndex.value < schemaComponents.value.length) {
    return schemaComponents.value[selectedCompIndex.value]
  }
  return null
})

// Preview state
const showPreviewTab = ref(route.query.tab === 'preview')
const useSampleData = ref(true)
const previewEntityId = ref('')
const previewLoading = ref(false)
const previewHtml = ref('')

// Validation modal state
const showValidationModal = ref(false)
const validationResult = ref({ isValid: true, errors: [] })

// Placeholder catalog state
const catalog = ref({})
const placeholderSearch = ref('')
const openGroups = ref({ iwo: true, customer: true, network: true, bast: true, acc: true })

function toggleGroup(k) {
  openGroups.value[k] = !openGroups.value[k]
}

function formatPlaceholder(key) {
  return '{{' + key + '}}'
}

const filteredCatalog = computed(() => {
  const query = placeholderSearch.value.toLowerCase().trim()
  if (!query) return catalog.value

  const res = {}
  Object.entries(catalog.value).forEach(([gKey, group]) => {
    const matches = group.fields.filter(
      (f) => f.key.toLowerCase().includes(query) || f.label.toLowerCase().includes(query)
    )
    if (matches.length > 0 || group.label.toLowerCase().includes(query)) {
      res[gKey] = { ...group, fields: matches.length > 0 ? matches : group.fields }
    }
  })
  return res
})

function getStatusBadgeClass(status) {
  if (status === 'ACTIVE') return 'badge-active'
  if (status === 'DRAFT') return 'badge-draft'
  return 'badge-inactive'
}

function selectComponent(comp, idx) {
  selectedCompIndex.value = idx
}

function markUnsaved() {
  hasUnsavedChanges.value = true
}

function addComponent(type) {
  const docType = template.value?.document_type || 'BAST'
  let newComp = { type }

  if (type === 'heading') {
    newComp = { type, text: 'Judul Baru', level: 3 }
  } else if (type === 'paragraph') {
    newComp = { type, text: 'Deskripsi paragraf baru...' }
  } else if (type === 'field_pair') {
    newComp = { type, label: 'Nama Field', value: '{{customer.name}}' }
  } else if (type === 'divider') {
    newComp = { type }
  } else if (type === 'dynamic_table') {
    newComp = {
      type,
      source: docType === 'ACC' ? 'equipments' : 'devices',
      columns: ['name', 'description', 'serial_number', 'quantity', 'location'],
    }
  } else if (type === 'requirements_table') {
    newComp = {
      type,
      source: 'requirements',
      columns: ['requirement', 'result', 'notes'],
    }
  } else if (type === 'approval_block') {
    newComp = {
      type,
      roles: ['ENGINEER', 'SALES', 'FULFILMENT', 'HEAD_OSS'],
    }
  } else if (type === 'customer_approval_block') {
    newComp = {
      type,
      notes: 'Dengan ini pelanggan menyatakan layanan telah aktif dan berfungsi sesuai SLA.',
    }
  }

  schemaComponents.value.push(newComp)
  selectedCompIndex.value = schemaComponents.value.length - 1
  markUnsaved()
}

function moveComponent(idx, delta) {
  const target = idx + delta
  if (target < 0 || target >= schemaComponents.value.length) return
  const temp = schemaComponents.value[idx]
  schemaComponents.value[idx] = schemaComponents.value[target]
  schemaComponents.value[target] = temp
  selectedCompIndex.value = target
  markUnsaved()
}

function deleteComponent(idx) {
  schemaComponents.value.splice(idx, 1)
  selectedCompIndex.value = -1
  markUnsaved()
}

function insertPlaceholder(key) {
  const placeholderStr = `{{${key}}}`
  if (selectedComponent.value) {
    if (selectedComponent.value.value !== undefined) {
      selectedComponent.value.value = placeholderStr
    } else if (selectedComponent.value.text !== undefined) {
      selectedComponent.value.text += ` ${placeholderStr}`
    }
    markUnsaved()
  } else {
    // Copy to clipboard as fallback
    navigator.clipboard?.writeText(placeholderStr)
    alert(`Placeholder ${placeholderStr} disalin ke clipboard!`)
  }
}

async function fetchTemplateData() {
  const templateId = route.params.id
  if (!templateId) return

  try {
    const res = await api.get(`/document-templates/${templateId}`)
    template.value = res.data.data

    const versionId = route.params.versionId
    if (versionId) {
      currentVer.value = template.value.versions?.find((v) => v.id === versionId)
    } else {
      currentVer.value = template.value.versions?.find((v) => v.is_current) || template.value.versions?.[0]
    }

    if (currentVer.value?.content) {
      try {
        const parsed = JSON.parse(currentVer.value.content)
        // Flatten sections to canvas components list
        const comps = []
        for (const s of parsed.sections || []) {
          for (const c of s.components || []) {
            comps.push(c)
          }
        }
        schemaComponents.value = comps
      } catch {
        schemaComponents.value = []
      }
    }

    hasUnsavedChanges.value = false
  } catch (err) {
    console.error('Failed to load template:', err)
  }
}

async function fetchCatalog() {
  try {
    const res = await api.get('/document-templates/placeholders/catalog')
    catalog.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch catalog:', err)
  }
}

function buildFullSchemaJson() {
  return {
    sections: [
      {
        type: 'body',
        components: schemaComponents.value,
      },
    ],
  }
}

async function saveDraft() {
  if (!template.value || !currentVer.value) return
  saving.value = true
  try {
    const fullSchema = buildFullSchemaJson()
    await api.patch(
      `/document-templates/${template.value.id}/versions/${currentVer.value.id}`,
      { content: fullSchema }
    )
    hasUnsavedChanges.value = false
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal menyimpan draft')
  } finally {
    saving.value = false
  }
}

async function openValidationModal() {
  if (!template.value || !currentVer.value) return
  try {
    const fullSchema = buildFullSchemaJson()
    // Test validation
    const res = await api.post(
      `/document-templates/${template.value.id}/versions/${currentVer.value.id}/validate`
    )
    validationResult.value = res.data.data
    showValidationModal.value = true
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal memvalidasi template')
  }
}

async function togglePreview() {
  showPreviewTab.value = !showPreviewTab.value
  if (showPreviewTab.value) {
    await loadPreview()
  }
}

async function loadPreview() {
  if (!template.value || !currentVer.value) return
  previewLoading.value = true
  try {
    const res = await api.post(
      `/document-templates/${template.value.id}/versions/${currentVer.value.id}/preview`,
      {
        use_sample: useSampleData.value,
        entity_id: previewEntityId.value || undefined,
      }
    )
    previewHtml.value = res.data.data.html
  } catch (err) {
    previewHtml.value = `<div class="p-6 text-rose-500 font-bold">Gagal render preview: ${err.response?.data?.message || err.message}</div>`
  } finally {
    previewLoading.value = false
  }
}

function printPreview() {
  const win = window.open('', '_blank')
  win.document.write(previewHtml.value)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 250)
}

async function handleActivate() {
  if (!confirm(`Aktifkan template versi v${currentVer.value?.version}? Versi aktif sebelumnya akan dinonaktifkan.`)) return
  if (hasUnsavedChanges.value) {
    await saveDraft()
  }
  try {
    await api.post(`/document-templates/${template.value.id}/versions/${currentVer.value.id}/activate`)
    await fetchTemplateData()
    alert('Versi template berhasil diaktifkan!')
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal mengaktifkan versi')
  }
}

async function handleNewVersionFromActive() {
  const parts = (currentVer.value?.version || '1.0').split('.')
  const nextVer = parts.length > 1 ? `${parts[0]}.${parseInt(parts[1]) + 1}` : '1.1'
  const newVerNumber = prompt('Masukkan nomor versi baru (DRAFT):', nextVer)
  if (!newVerNumber) return

  try {
    const res = await api.post(`/document-templates/${template.value.id}/versions`, {
      version: newVerNumber,
      base_version_id: currentVer.value?.id,
    })
    router.push(`/administration/document-templates/${template.value.id}/versions/${res.data.data.id}/edit`)
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal membuat versi baru')
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    const confirmLeave = confirm('Perubahan template belum disimpan. Tetap tinggalkan halaman?')
    if (confirmLeave) next()
    else next(false)
  } else {
    next()
  }
})

onMounted(async () => {
  await fetchCatalog()
  await fetchTemplateData()
  if (showPreviewTab.value) {
    await loadPreview()
  }
})
</script>

<style scoped>
.comp-btn {
  @apply flex items-center gap-2.5 w-full p-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-700 transition text-left;
}
</style>
