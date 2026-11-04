<template>
  <div class="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors">
    <!-- Mobile Drawer Overlay -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
      @click="mobileOpen = false"
    />

    <!-- SIDEBAR -->
    <aside
      :class="[
        'fixed lg:sticky top-0 h-screen z-50 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 transition-all duration-300 shadow-sm',
        collapsed ? 'w-[76px]' : 'w-[250px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Logo & App Header -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700/80">
        <div class="flex items-center gap-3 overflow-hidden">
          <img src="/velo-logo.jpg" alt="Logo VELO" class="w-9 h-9 rounded-lg object-cover shadow-sm shrink-0" />
          <div v-if="!collapsed" class="flex flex-col overflow-hidden">
            <span class="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-none">VELO SYSTEM</span>
            <span class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase mt-1">Work Order Hub</span>
          </div>
        </div>
        <button
          class="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
          @click="collapsed = !collapsed"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <ChevronLeftIcon v-if="!collapsed" class="w-4 h-4" />
          <ChevronRightIcon v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        <!-- Main Navigation Section -->
        <div>
          <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Overview
          </div>
          <router-link
            to="/dashboard"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path === '/dashboard' }"
            @click="mobileOpen = false"
          >
            <LayoutDashboardIcon class="w-4 h-4 shrink-0" />
            <span v-if="!collapsed" class="truncate">Dashboard</span>
          </router-link>
        </div>

        <!-- Operations Section -->
        <div>
          <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Operations
          </div>
          <router-link
            to="/iwo"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path.startsWith('/iwo') }"
            @click="mobileOpen = false"
          >
            <ClipboardListIcon class="w-4 h-4 shrink-0" />
            <span v-if="!collapsed" class="truncate">Internal Work Order</span>
          </router-link>
        </div>

        <!-- Administration Section (Admin & Management) -->
        <div v-if="authStore.isManagement">
          <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Administration
          </div>
          <div class="space-y-1">
            <router-link
              to="/administration/document-templates"
              class="nav-link"
              :class="{ 'nav-link-active': $route.path.startsWith('/administration/document-templates') }"
              @click="mobileOpen = false"
            >
              <FileCodeIcon class="w-4 h-4 shrink-0" />
              <div v-if="!collapsed" class="flex items-center justify-between flex-1 overflow-hidden">
                <span class="truncate">Document Templates</span>
                <span class="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold">BAST/ACC</span>
              </div>
            </router-link>

            <router-link
              v-if="authStore.isAdmin"
              to="/administration/users"
              class="nav-link"
              :class="{ 'nav-link-active': $route.path === '/administration/users' }"
              @click="mobileOpen = false"
            >
              <UsersIcon class="w-4 h-4 shrink-0" />
              <span v-if="!collapsed" class="truncate">Users & Roles</span>
            </router-link>

            <router-link
              to="/administration/audit-log"
              class="nav-link"
              :class="{ 'nav-link-active': $route.path === '/administration/audit-log' }"
              @click="mobileOpen = false"
            >
              <ShieldCheckIcon class="w-4 h-4 shrink-0" />
              <span v-if="!collapsed" class="truncate">Audit Log</span>
            </router-link>
          </div>
        </div>

        <!-- Connection / Integrations -->
        <div v-if="authStore.isManagement">
          <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Integrations
          </div>
          <router-link
            to="/connection/email"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path.startsWith('/connection/email') }"
            @click="mobileOpen = false"
          >
            <MailIcon class="w-4 h-4 shrink-0" />
            <span v-if="!collapsed" class="truncate">Email Connection</span>
          </router-link>
        </div>

        <!-- Reports -->
        <div>
          <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Analytics
          </div>
          <router-link
            to="/reports"
            class="nav-link"
            :class="{ 'nav-link-active': $route.path === '/reports' }"
            @click="mobileOpen = false"
          >
            <BarChart3Icon class="w-4 h-4 shrink-0" />
            <span v-if="!collapsed" class="truncate">Reports & SLA</span>
          </router-link>
        </div>
      </div>

      <!-- User footer & theme -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex flex-1 min-w-0 items-center gap-3 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            @click="openProfileModal"
            title="Edit profil"
            aria-label="Edit profil"
          >
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              {{ userInitials }}
            </div>
            <div v-if="!collapsed" class="flex-1 overflow-hidden">
              <p class="text-xs font-semibold text-slate-900 dark:text-white truncate">{{ authStore.user?.name || 'User' }}</p>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ authStore.user?.role }}</p>
            </div>
          </button>
          <button
            v-if="!collapsed"
            type="button"
            @click="handleLogout"
            class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60"
            title="Keluar"
          >
            <LogOutIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- TOPBAR -->
      <header class="h-16 sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/80 px-4 lg:px-8 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            class="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            @click="mobileOpen = true"
          >
            <MenuIcon class="w-5 h-5" />
          </button>
          <div class="flex flex-col">
            <h1 class="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {{ currentTitle }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Light/Dark Mode Switch -->
          <button
            @click="themeStore.toggle()"
            class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            :title="themeStore.isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'"
          >
            <SunIcon v-if="themeStore.isDark" class="w-4 h-4 text-amber-400" />
            <MoonIcon v-else class="w-4 h-4 text-slate-600" />
          </button>

          <!-- User Role Pill -->
          <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {{ authStore.user?.role }}
          </span>
        </div>
      </header>

      <!-- VIEW CONTENT -->
      <main class="flex-1 p-4 lg:p-6 overflow-x-hidden">
        <router-view />
      </main>
    </div>

    <div
      v-if="showProfileModal"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      @click.self="showProfileModal = false"
    >
      <div class="card w-full max-w-md space-y-4 bg-white p-6 shadow-2xl dark:bg-slate-800">
        <div>
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Edit Profil</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Perbarui informasi profil Anda.</p>
        </div>

        <div
          v-if="profileError"
          class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ profileError }}
        </div>

        <form class="space-y-3" @submit.prevent="saveProfile">
          <div>
            <label class="form-label">Nama</label>
            <input v-model.trim="profileForm.name" class="form-input text-xs" required maxlength="255" />
          </div>
          <div>
            <label class="form-label">Email</label>
            <input v-model.trim="profileForm.email" type="email" class="form-input text-xs" required maxlength="255" />
          </div>
          <div>
            <label class="form-label">Nomor Telepon</label>
            <input v-model.trim="profileForm.phone" type="tel" class="form-input text-xs" maxlength="255" />
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Peran akun: {{ authStore.user?.role }}
          </p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="btn-secondary text-xs" @click="showProfileModal = false">Batal</button>
            <button type="submit" class="btn-primary text-xs" :disabled="savingProfile">
              {{ savingProfile ? 'Menyimpan...' : 'Simpan Profil' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useThemeStore } from '../stores/theme.js'
import {
  LayoutDashboard as LayoutDashboardIcon,
  ClipboardList as ClipboardListIcon,
  FileCode as FileCodeIcon,
  Users as UsersIcon,
  ShieldCheck as ShieldCheckIcon,
  Mail as MailIcon,
  BarChart3 as BarChart3Icon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  LogOut as LogOutIcon,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const collapsed = ref(false)
const mobileOpen = ref(false)
const showProfileModal = ref(false)
const savingProfile = ref(false)
const profileError = ref('')
const profileForm = ref({ name: '', email: '', phone: '' })

const userInitials = computed(() => {
  const name = authStore.user?.name || 'User'
  return name.slice(0, 2).toUpperCase()
})

function openProfileModal() {
  mobileOpen.value = false
  profileForm.value = {
    name: authStore.user?.name || '',
    email: authStore.user?.email || '',
    phone: authStore.user?.phone || '',
  }
  profileError.value = ''
  showProfileModal.value = true
}

async function saveProfile() {
  profileError.value = ''
  savingProfile.value = true
  try {
    await authStore.updateProfile(profileForm.value)
    showProfileModal.value = false
  } catch (err) {
    profileError.value = err.response?.data?.message || 'Profil gagal disimpan. Silakan coba lagi.'
  } finally {
    savingProfile.value = false
  }
}

const currentTitle = computed(() => {
  if (route.name === 'Dashboard') return 'Operational Dashboard'
  if (route.name === 'IwoList') return 'Internal Work Orders'
  if (route.name === 'IwoCreate') return 'Buat Work Order Baru'
  if (route.name === 'IwoDetail') return 'Detail Work Order'
  if (route.name === 'DocumentTemplates') return 'Document Templates'
  if (route.name === 'TemplateCreate' || route.name === 'TemplateEdit' || route.name === 'TemplateVersionEdit') return 'Template Designer'
  if (route.name === 'Users') return 'Kelola Pengguna'
  if (route.name === 'AuditLog') return 'Audit Log Sistem'
  if (route.name === 'EmailConnection') return 'Email Connection'
  if (route.name === 'Reports') return 'Laporan & SLA'
  return 'VELO Management System'
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.nav-link {
  @apply flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white transition-all;
}
.nav-link-active {
  @apply bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-400 rounded-l-none;
}
</style>
