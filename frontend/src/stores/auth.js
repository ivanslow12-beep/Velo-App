import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('velo_user') || 'null'))
  const token = ref(localStorage.getItem('velo_token') || null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMINISTRATOR')
  const isManagement = computed(() => ['ADMINISTRATOR', 'MANAGEMENT'].includes(user.value?.role))
  const isEngineer = computed(() => user.value?.role === 'ENGINEER')
  const isSales = computed(() => user.value?.role === 'SALES')
  const hasRole = (...roles) => roles.includes(user.value?.role)

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    token.value = res.data.data.token
    user.value = res.data.data.user
    localStorage.setItem('velo_token', token.value)
    localStorage.setItem('velo_user', JSON.stringify(user.value))
    return user.value
  }

  async function updateProfile(profile) {
    const res = await api.patch('/users/me', profile)
    user.value = res.data.data
    localStorage.setItem('velo_user', JSON.stringify(user.value))
    return user.value
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('velo_token')
    localStorage.removeItem('velo_user')
  }

  return { user, token, isAuthenticated, isAdmin, isManagement, isEngineer, isSales, hasRole, login, updateProfile, logout }
})
