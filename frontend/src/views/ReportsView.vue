<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">Laporan & SLA Performance</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Analisis performa SLA, volume order, dan distribusi prioritas.</p>
      </div>
      <button @click="printReport" class="btn-secondary text-xs self-start sm:self-auto">
        <PrinterIcon class="w-4 h-4 text-slate-500" />
        <span>Cetak Laporan</span>
      </button>
    </div>

    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="card p-5">
        <span class="text-xs font-medium text-slate-500">Total IWO Masuk</span>
        <div class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ summary.total || 0 }}</div>
      </div>
      <div class="card p-5">
        <span class="text-xs font-medium text-slate-500">Selesai (Completed)</span>
        <div class="text-2xl font-bold text-emerald-600 mt-2">{{ summary.completed || 0 }}</div>
      </div>
      <div class="card p-5">
        <span class="text-xs font-medium text-slate-500">Breached / Overdue</span>
        <div class="text-2xl font-bold text-rose-600 mt-2">{{ summary.overdue || 0 }}</div>
      </div>
    </div>

    <!-- Tables for Type & Priority -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card p-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Distribusi Request Type</h2>
        <div class="space-y-2 text-xs">
          <div
            v-for="(count, type) in (summary.by_request_type || {})"
            :key="type"
            class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
          >
            <span class="font-medium">{{ type }}</span>
            <span class="font-bold">{{ count }}</span>
          </div>
        </div>
      </div>

      <div class="card p-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Distribusi Prioritas</h2>
        <div class="space-y-2 text-xs">
          <div
            v-for="(count, prio) in (summary.by_priority || {})"
            :key="prio"
            class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40"
          >
            <span class="font-medium">{{ prio }}</span>
            <span class="font-bold">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index.js'
import { Printer as PrinterIcon } from 'lucide-vue-next'

const summary = ref({})

async function loadSummary() {
  try {
    const res = await api.get('/reports/summary')
    summary.value = res.data.data
  } catch (err) {
    console.error('Failed to load reports:', err)
  }
}

function printReport() {
  window.print()
}

onMounted(() => {
  loadSummary()
})
</script>
