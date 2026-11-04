<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors">
    <div class="w-full max-w-md">
      <!-- Brand & Header -->
      <div class="text-center mb-8">
        <img src="/velo-logo.jpg" alt="Logo VELO" class="inline-flex w-12 h-12 rounded-xl object-cover shadow-md mb-3" />
        <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">VELO INTERNAL SYSTEM</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Work Order, BAST, ACC & Document Template Hub</p>
      </div>

      <!-- Login Card -->
      <div class="card p-6 sm:p-8 bg-white dark:bg-slate-800 shadow-md">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div v-if="errorMsg" class="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ errorMsg }}</span>
          </div>

          <div>
            <label class="form-label">Email Perusahaan</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="nama@velo.co.id"
              class="form-input"
            />
          </div>

          <div>
            <label class="form-label">Password</label>
            <input
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="form-input"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary py-2.5 mt-2"
          >
            <span v-if="loading">Memproses...</span>
            <span v-else>Masuk ke Sistem</span>
          </button>
        </form>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Login gagal, periksa email dan password'
  } finally {
    loading.value = false
  }
}
</script>
