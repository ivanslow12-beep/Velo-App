import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'iwo', name: 'IwoList', component: () => import('../views/iwo/IwoListView.vue') },
      { path: 'iwo/create', name: 'IwoCreate', component: () => import('../views/iwo/IwoCreateView.vue') },
      { path: 'iwo/:id', name: 'IwoDetail', component: () => import('../views/iwo/IwoDetailView.vue') },
      { path: 'iwo/:id/edit', name: 'IwoEdit', component: () => import('../views/iwo/IwoEditView.vue') },
      { path: 'bast/:id', name: 'BastDetail', component: () => import('../views/bast/BastDetailView.vue') },
      { path: 'acc/:id', name: 'AccDetail', component: () => import('../views/acc/AccDetailView.vue') },
      { path: 'reports', name: 'Reports', component: () => import('../views/ReportsView.vue') },
      {
        path: 'administration/document-templates',
        name: 'DocumentTemplates',
        component: () => import('../views/admin/DocumentTemplatesView.vue'),
      },
      {
        path: 'administration/document-templates/create',
        name: 'TemplateCreate',
        component: () => import('../views/admin/TemplateEditorView.vue'),
      },
      {
        path: 'administration/document-templates/:id/edit',
        name: 'TemplateEdit',
        component: () => import('../views/admin/TemplateEditorView.vue'),
      },
      {
        path: 'administration/document-templates/:id/versions/:versionId/edit',
        name: 'TemplateVersionEdit',
        component: () => import('../views/admin/TemplateEditorView.vue'),
      },
      {
        path: 'administration/users',
        name: 'Users',
        component: () => import('../views/admin/UsersView.vue'),
      },
      {
        path: 'administration/audit-log',
        name: 'AuditLog',
        component: () => import('../views/admin/AuditLogView.vue'),
      },
      {
        path: 'connection/email',
        name: 'EmailConnection',
        component: () => import('../views/connection/EmailConnectionView.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'Login' }
  }
  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Dashboard' }
  }
})

export default router
