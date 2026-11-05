<template>
  <div class="space-y-6">
    <!-- Top KPI Row (Clickable) -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
      <div
        @click="goToIwo('')"
        class="card p-4 hover:border-blue-400 dark:hover:border-blue-600 transition cursor-pointer group"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Total IWO</span>
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {{ stats.kpi?.total || 0 }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Semua order kerja</div>
      </div>

      <div
        @click="goToIwo('PENDING')"
        class="card p-4 hover:border-amber-400 dark:hover:border-amber-600 transition cursor-pointer group"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Pending IWO</span>
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        </div>
        <div class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
          {{ stats.kpi?.pending || 0 }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Menunggu proses</div>
      </div>

      <div
        @click="goToIwo('IN_PROGRESS')"
        class="card p-4 hover:border-blue-400 dark:hover:border-blue-600 transition cursor-pointer group"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>In Progress</span>
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        </div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
          {{ stats.kpi?.in_progress || 0 }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Dalam pengerjaan</div>
      </div>

      <div
        @click="goToIwoOverdue()"
        class="card p-4 hover:border-rose-400 dark:hover:border-rose-600 transition cursor-pointer group"
      >
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>Overdue IWO</span>
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        </div>
        <div class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
          {{ stats.kpi?.overdue || 0 }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Lewat deadline RFS</div>
      </div>

      <div class="card p-4 col-span-2 md:col-span-1 border-emerald-200 dark:border-emerald-900/50">
        <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
          <span>SLA Performance</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
          {{ stats.kpi?.sla_rate || '100%' }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Ketepatan waktu RFS</div>
      </div>
    </div>

    <!-- Charts / Breakdown Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Status Distribution (Donut style bars) -->
      <div class="card p-5">
        <h2 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Distribusi Status IWO
        </h2>
        <div class="space-y-3">
          <div
            v-for="(count, st) in (stats.status_distribution || {})"
            :key="st"
            @click="goToIwo(st)"
            class="group cursor-pointer"
          >
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="font-medium text-slate-600 dark:text-slate-300 group-hover:text-blue-600">{{ st === 'CANCELLED' ? 'CANCEL' : st }}</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ count }}</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="getStatusColor(st)"
                :style="{ width: calculatePercent(count) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Monthly Trend -->
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Tren Permintaan IWO Bulanan
          </h2>
          <span class="text-[11px] text-slate-400">6 Bulan Terakhir</span>
        </div>
        <div class="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-700">
          <div
            v-for="item in (stats.monthly_trend || [])"
            :key="item.month"
            class="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
          >
            <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 transition">
              {{ item.count }}
            </div>
            <div
              class="w-full max-w-[42px] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-500"
              :style="{ height: Math.max(12, (item.count / maxTrendCount) * 100) + '%' }"
            ></div>
            <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ item.month }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Perlu Tindakan (Action Required) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Pending IWO Table -->
      <div class="card">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <h2 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Perlu Tindakan: Pending IWO
            </h2>
          </div>
          <router-link to="/iwo?status=PENDING" class="text-xs font-semibold text-blue-600 hover:underline">
            Lihat Semua
          </router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr>
                <th class="table-header">No. IWO</th>
                <th class="table-header">Pelanggan</th>
                <th class="table-header">Layanan</th>
                <th class="table-header">Progress</th>
                <th class="table-header">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!stats.action_required?.pending_list?.length">
                <td colspan="5" class="table-cell text-center text-slate-400 py-6">
                  Tidak ada IWO pending saat ini
                </td>
              </tr>
              <tr v-for="item in (stats.action_required?.pending_list || [])" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="table-cell font-mono font-semibold text-blue-600 dark:text-blue-400">
                  <router-link :to="`/iwo/${item.id}`">{{ item.iwo_no }}</router-link>
                </td>
                <td class="table-cell font-medium">{{ item.customer?.name || '-' }}</td>
                <td class="table-cell text-slate-500">{{ item.service?.name || '-' }}</td>
                <td class="table-cell">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div class="h-full rounded-full bg-blue-600" :style="{ width: `${item.progress || 0}%` }"></div>
                    </div>
                    <span class="text-[10px] font-mono text-slate-500">{{ item.progress || 0 }}%</span>
                  </div>
                </td>
                <td class="table-cell">
                  <router-link :to="`/iwo/${item.id}`" class="text-xs font-semibold text-blue-600 hover:text-blue-800">
                    Proses →
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Overdue IWO Table -->
      <div class="card">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Perlu Tindakan: Overdue IWO
            </h2>
          </div>
          <router-link to="/iwo?is_overdue=true" class="text-xs font-semibold text-rose-600 hover:underline">
            Lihat Semua
          </router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr>
                <th class="table-header">No. IWO</th>
                <th class="table-header">Pelanggan</th>
                <th class="table-header">Deadline RFS</th>
                <th class="table-header">Progress</th>
                <th class="table-header">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!stats.action_required?.overdue_list?.length">
                <td colspan="5" class="table-cell text-center text-slate-400 py-6">
                  Tidak ada IWO overdue
                </td>
              </tr>
              <tr v-for="item in (stats.action_required?.overdue_list || [])" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="table-cell font-mono font-semibold text-rose-600 dark:text-rose-400">
                  <router-link :to="`/iwo/${item.id}`">{{ item.iwo_no }}</router-link>
                </td>
                <td class="table-cell font-medium">{{ item.customer?.name || '-' }}</td>
                <td class="table-cell text-rose-600 font-semibold text-[11px]">{{ item.deadline_rfs || '-' }}</td>
                <td class="table-cell">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div class="h-full rounded-full bg-blue-600" :style="{ width: `${item.progress || 0}%` }"></div>
                    </div>
                    <span class="text-[10px] font-mono text-slate-500">{{ item.progress || 0 }}%</span>
                  </div>
                </td>
                <td class="table-cell">
                  <router-link :to="`/iwo/${item.id}`" class="text-xs font-semibold text-blue-600 hover:text-blue-800">
                    Review →
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'

const router = useRouter()
const stats = ref({})

const maxTrendCount = computed(() => {
  const counts = (stats.value.monthly_trend || []).map((t) => t.count)
  return Math.max(1, ...counts)
})

function calculatePercent(count) {
  const total = stats.value.kpi?.total || 1
  return Math.round((count / total) * 100)
}

function getStatusColor(st) {
  const map = {
    DRAFT: 'bg-slate-400',
    PENDING: 'bg-amber-500',
    IN_PROGRESS: 'bg-blue-500',
    ACTIVATION: 'bg-indigo-500',
    BAST: 'bg-purple-500',
    ACC: 'bg-cyan-500',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-rose-500',
  }
  return map[st] || 'bg-slate-400'
}

function goToIwo(status) {
  if (status) {
    router.push({ path: '/iwo', query: { status } })
  } else {
    router.push('/iwo')
  }
}

function goToIwoOverdue() {
  router.push({ path: '/iwo', query: { is_overdue: 'true' } })
}

async function loadDashboard() {
  try {
    const res = await api.get('/dashboard')
    stats.value = res.data.data
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  }
}

onMounted(() => {
  loadDashboard()
})
</script>
