<template>
  <div v-if="loading" class="py-20 text-center text-slate-400 text-xs">
    Memuat detail IWO...
  </div>
  <div v-else-if="iwo" class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <router-link to="/iwo" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <ArrowLeftIcon class="w-4 h-4" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-mono font-bold text-slate-900 dark:text-white">{{ iwo.iwo_no }}</h1>
            <span class="badge" :class="getStatusBadgeClass(iwo.status)">{{ getStatusLabel(iwo.status) }}</span>
            <select
              v-if="canChangeStatus"
              :value="iwo.status"
              @change="updateIwoStatus($event.target.value)"
              :disabled="actionLoading"
              class="form-input text-[11px] py-1 w-auto"
              aria-label="Ubah status IWO"
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">Dalam Proses</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Cancel</option>
            </select>
            <span v-if="iwo.status_locked" class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              Status manual
            </span>
            <span v-if="iwo.is_archived" class="badge bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">ARSIP</span>
            <span v-if="iwo.is_overdue" class="badge badge-danger">OVERDUE</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">{{ iwo.customer_name_manual || iwo.customer?.name }} • {{ iwo.service_name_manual || iwo.service?.name }}</p>
        </div>
      </div>

      <!-- Action Buttons (Edit, Archive, Delete, BAST, ACC) -->
      <div class="flex items-center flex-wrap gap-2">
        <router-link
          :to="`/iwo/${iwo.id}/edit`"
          class="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          title="Edit data IWO ini"
        >
          <EditIcon class="w-3.5 h-3.5 text-blue-500" />
          <span>Edit IWO</span>
        </router-link>

        <button
          type="button"
          @click="showDetailArchiveModal = true"
          class="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 text-purple-600 dark:text-purple-400"
          title="Ubah status arsip"
        >
          <ArchiveIcon class="w-3.5 h-3.5" />
          <span>{{ iwo.is_archived ? 'Buka Arsip' : 'Arsipkan' }}</span>
        </button>

        <button
          type="button"
          @click="showDetailDeleteModal = true"
          class="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          title="Hapus IWO"
        >
          <Trash2Icon class="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>

        <div class="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

        <router-link
          v-if="iwo.bast"
          :to="`/bast/${iwo.bast.id}`"
          class="btn-primary bg-purple-600 hover:bg-purple-700 text-xs"
        >
          <FileTextIcon class="w-4 h-4" />
          <span>Lihat BAST ({{ iwo.bast.status }})</span>
        </router-link>
        <button
          v-else
          @click="openCreateBastModal"
          class="btn-primary bg-purple-600 hover:bg-purple-700 text-xs"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Buat Dokumen BAST</span>
        </button>

        <router-link
          v-if="iwo.acc"
          :to="`/acc/${iwo.acc.id}`"
          class="btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs"
        >
          <CheckSquareIcon class="w-4 h-4" />
          <span>Lihat ACC ({{ iwo.acc.status }})</span>
        </router-link>
        <button
          v-else-if="iwo.bast"
          @click="openCreateAccModal"
          class="btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Buat Dokumen ACC</span>
        </button>
      </div>
    </div>

    <!-- Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- General Info -->
      <div class="card p-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Pelanggan</h2>
        <div class="space-y-2 text-xs">
          <div>
            <span class="text-slate-400 block text-[11px]">Nama Pelanggan</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ iwo.customer_name_manual || iwo.customer?.name || '-' }}</span>
          </div>
          <div v-if="iwo.customer?.code">
            <span class="text-slate-400 block text-[11px]">Kode Pelanggan</span>
            <span class="font-mono text-slate-700 dark:text-slate-300">{{ iwo.customer.code }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Alamat Instalasi</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.customer_address_manual || iwo.customer?.address || '-' }}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Kontak Person (PIC)</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.customer_contact_person || iwo.customer?.contact_name || '-' }}</span>
          </div>
          <div v-if="iwo.customer_phone || iwo.customer?.phone">
            <span class="text-slate-400 block text-[11px]">No. Telepon / WA</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.customer_phone || iwo.customer?.phone }}</span>
          </div>
          <div v-if="iwo.customer_email || iwo.customer?.email">
            <span class="text-slate-400 block text-[11px]">Email Customer</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.customer_email || iwo.customer?.email }}</span>
          </div>
        </div>
      </div>

      <!-- Service, PIC Project & Mitra -->
      <div class="card p-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Layanan, Mitra & Sales</h2>
        <div class="space-y-2 text-xs">
          <div>
            <span class="text-slate-400 block text-[11px]">Paket Layanan</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ iwo.service_name_manual || iwo.service?.name || '-' }}</span>
          </div>
          <div v-if="(iwo.service_price !== null && iwo.service_price !== undefined && iwo.service_price !== '') || (iwo.service?.price !== null && iwo.service?.price !== undefined && iwo.service?.price !== '')">
            <span class="text-slate-400 block text-[11px]">Tarif Layanan</span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">
              Rp {{ Number(iwo.service_price ?? iwo.service?.price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
            </span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Tipe Permintaan / Prioritas</span>
            <span class="font-semibold text-blue-600">{{ iwo.request_type }}</span> • 
            <span class="font-bold text-amber-500">{{ iwo.priority }}</span>
          </div>
          <div v-if="iwo.pic_project">
            <span class="text-slate-400 block text-[11px]">PIC Project</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.pic_project }}</span>
          </div>
          <div v-if="iwo.pop_or_standalone">
            <span class="text-slate-400 block text-[11px]">POP / Standalone</span>
            <span class="text-slate-700 dark:text-slate-300">{{ iwo.pop_or_standalone }}</span>
          </div>
          <div v-if="iwo.partner_1 || iwo.partner_2">
            <span class="text-slate-400 block text-[11px]">Mitra Proyek</span>
            <span class="text-slate-700 dark:text-slate-300">
              {{ [iwo.partner_1, iwo.partner_2].filter(Boolean).join(' • ') }}
            </span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Sales / Industry</span>
            <span class="text-slate-700 dark:text-slate-300">
              {{ iwo.sales_name_manual || iwo.sales?.name || '-' }}
              {{ iwo.industry_sales ? `(${iwo.industry_sales})` : '' }}
            </span>
          </div>
          <div>
            <span class="text-slate-400 block text-[11px]">Deadline RFS</span>
            <span class="font-bold" :class="iwo.is_overdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'">
              {{ iwo.deadline_rfs || '-' }} (SLA: {{ iwo.sla_days || 14 }} Hari)
            </span>
          </div>
        </div>
      </div>

      <!-- Milestones List -->
      <div class="card flex min-h-[340px] min-w-0 max-h-[500px] flex-col overflow-hidden">
        <div class="sticky top-0 z-10 flex-shrink-0 space-y-3 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Tahapan & Progress</h2>
              <p class="mt-1 text-[11px] text-slate-500">
                {{ completedMilestones }}/{{ totalMilestones }} tahap selesai · progress dihitung otomatis oleh sistem.
              </p>
            </div>
            <button type="button" @click="showAddMilestone = !showAddMilestone" class="btn-secondary shrink-0 text-xs py-1.5 px-3">
              {{ showAddMilestone ? 'Batal' : '+ Tambah Tahap' }}
            </button>
          </div>
          <div>
            <div class="mb-1.5 flex items-center justify-between text-[11px]">
              <span class="font-semibold text-slate-600 dark:text-slate-300">Progress IWO</span>
              <span class="font-bold text-blue-600 dark:text-blue-400">{{ milestoneProgress }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div class="h-full rounded-full bg-blue-600 transition-all" :style="{ width: `${milestoneProgress}%` }"></div>
            </div>
          </div>
        </div>

        <div class="milestone-scroll min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
          <form v-if="showAddMilestone" @submit.prevent="addMilestone" class="space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">Tambah tahapan baru</p>
            <input v-model="newMilestone.name" required maxlength="255" class="form-input text-xs" placeholder="Nama tahapan" />
            <textarea v-model="newMilestone.description" rows="2" class="form-input text-xs" placeholder="Catatan / detail tahapan (opsional)"></textarea>
            <div>
              <label class="form-label text-[11px]">Tanggal target</label>
              <input v-model="newMilestone.due_date" type="date" class="form-input text-xs" />
            </div>
            <div class="flex justify-end">
              <button type="submit" :disabled="savingMilestone" class="btn-primary text-xs py-1.5 px-3">
                {{ savingMilestone ? 'Menyimpan...' : 'Simpan Tahapan' }}
              </button>
            </div>
          </form>

          <p v-if="!iwo.milestones?.length" class="py-4 text-center text-xs text-slate-400">
            Belum ada tahapan. Tambahkan tahapan untuk mulai mencatat progress.
          </p>
          <div
            v-for="(ms, index) in (iwo.milestones || [])"
            :key="ms.id"
            class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60"
          >
            <button
              type="button"
              @click="toggleMilestone(ms.id)"
              :aria-expanded="expandedMilestoneId === ms.id"
              class="flex w-full items-start gap-2 p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
            >
              <CheckCircleIcon
                v-if="ms.status === 'DONE'"
                class="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-label="Selesai"
              />
              <span v-else class="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-500"></span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-100">TAHAP {{ index + 1 }}: {{ ms.name }}</span>
                  <span class="rounded bg-blue-900/70 px-1.5 py-0.5 text-[9px] font-bold text-blue-200">BOBOT OTOMATIS {{ formatWeight(ms.weight) }}%</span>
                </span>
                <span class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
                  <span class="inline-flex items-center gap-1">
                    <CalendarIcon class="h-3 w-3" />
                    Target: {{ formatMilestoneDate(ms.due_date) || '-' }}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span class="inline-flex items-center gap-1" :class="ms.status === 'DONE' ? 'text-emerald-400' : ''">
                    <CheckIcon class="h-3 w-3" />
                    Selesai: {{ formatMilestoneDate(ms.completed_at) || '-' }}
                  </span>
                </span>
                <span v-if="ms.description" class="mt-1.5 block text-[10px] leading-relaxed text-slate-400">
                  Catatan: {{ ms.description }}
                </span>
              </span>
              <span class="inline-flex shrink-0 items-center gap-1.5">
                <span class="rounded border px-1.5 py-0.5 text-[9px] font-bold" :class="getMilestoneStatusClass(ms.status)">
                  {{ getMilestoneStatusLabel(ms.status) }}
                </span>
                <ChevronDownIcon class="h-3.5 w-3.5 text-slate-400 transition-transform" :class="{ 'rotate-180': expandedMilestoneId === ms.id }" />
              </span>
            </button>

            <div v-if="expandedMilestoneId === ms.id" class="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span class="text-[10px] font-bold text-slate-400">TAHAP {{ index + 1 }}</span>
                <input v-model="ms.name" maxlength="255" class="form-input flex-1 text-xs font-semibold" aria-label="Nama tahapan" />
              </div>
              <textarea v-model="ms.description" rows="2" class="form-input text-xs" placeholder="Catatan tahapan (opsional)"></textarea>
              <div>
                <label class="form-label text-[11px]">Tanggal target</label>
                <input v-model="ms.due_date" type="date" class="form-input text-xs" />
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <button type="button" @click="saveMilestone(ms)" :disabled="savingMilestone" class="btn-primary text-xs py-1.5 px-3">
                  {{ savingMilestone ? 'Menyimpan...' : 'Simpan & Selesaikan' }}
                </button>
                <button type="button" @click="deleteMilestone(ms)" :disabled="savingMilestone" class="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-700">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Network Configuration & Installed Devices -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Network Info -->
      <div class="card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Konfigurasi Jaringan & IP</h2>
          <button @click="saveNetwork" class="btn-primary text-xs py-1 px-2.5">Simpan Network</button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label class="form-label text-[11px]">Node / POP</label>
            <input v-model="networkForm.node_pop" class="form-input text-xs" placeholder="POP-01" />
          </div>
          <div>
            <label class="form-label text-[11px]">Tipe Koneksi</label>
            <input v-model="networkForm.connection_type" class="form-input text-xs" placeholder="FO Direct" />
          </div>
          <div>
            <label class="form-label text-[11px]">POP Switch</label>
            <input v-model="networkForm.pop_switch" class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label text-[11px]">Switch Port</label>
            <input v-model="networkForm.switch_port" class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label text-[11px]">WAN IP</label>
            <input v-model="networkForm.wan_ip" class="form-input text-xs font-mono" />
          </div>
          <div>
            <label class="form-label text-[11px]">Public IP</label>
            <input v-model="networkForm.public_ip" class="form-input text-xs font-mono" />
          </div>
          <div>
            <label class="form-label text-[11px]">VLAN</label>
            <input v-model="networkForm.vlan" class="form-input text-xs font-mono" />
          </div>
          <div>
            <label class="form-label text-[11px]">Router Model</label>
            <input v-model="networkForm.router" class="form-input text-xs" />
          </div>
        </div>
      </div>

      <!-- Device List -->
      <div class="card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Data Perangkat (Device Table)</h2>
          <button @click="openAddDeviceModal" class="btn-secondary text-xs py-1 px-2.5">
            + Tambah Perangkat
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr>
                <th class="table-header">Perangkat</th>
                <th class="table-header">Serial No</th>
                <th class="table-header">Qty</th>
                <th class="table-header">Lokasi</th>
                <th class="table-header"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!iwo.devices?.length">
                <td colspan="5" class="table-cell text-center text-slate-400 py-6">Belum ada perangkat terdaftar</td>
              </tr>
              <tr v-for="dev in (iwo.devices || [])" :key="dev.id">
                <td class="table-cell font-semibold">{{ dev.name }}</td>
                <td class="table-cell font-mono">{{ dev.serial_number || '-' }}</td>
                <td class="table-cell">{{ dev.quantity }}</td>
                <td class="table-cell text-slate-500">{{ dev.location || '-' }}</td>
                <td class="table-cell text-right">
                  <button @click="deleteDevice(dev.id)" class="text-rose-500 hover:text-rose-700">×</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CREATE BAST MODAL (With Template Selection!) -->
    <div v-if="showBastModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">Buat Dokumen BAST Baru</h2>
        <p class="text-xs text-slate-500">Pilih template BAST yang akan digunakan (default otomatis terpilih):</p>

        <form @submit.prevent="submitCreateBast" class="space-y-3">
          <div>
            <label class="form-label">BAST Document Template *</label>
            <select v-model="bastForm.document_template_id" required class="form-input text-xs">
              <option v-for="t in bastTemplates" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.code }}) {{ t.is_default ? '★ DEFAULT' : '' }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Tanggal Aktif / Serah Terima *</label>
            <input type="date" v-model="bastForm.active_date" required class="form-input text-xs" />
          </div>
          <div>
            <label class="form-label">Catatan BAST</label>
            <textarea v-model="bastForm.notes" rows="2" class="form-input text-xs" placeholder="Keterangan pengujian..."></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showBastModal = false" class="btn-secondary text-xs">Batal</button>
            <button type="submit" class="btn-primary text-xs">Buat BAST & Lanjutkan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- CREATE ACC MODAL (With Template Selection!) -->
    <div v-if="showAccModal" class="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div class="card max-w-md w-full p-6 space-y-4 bg-white dark:bg-slate-800 shadow-2xl">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white">Buat Dokumen ACC Baru</h2>
        <p class="text-xs text-slate-500">Pilih template ACC yang akan digunakan (default otomatis terpilih):</p>

        <form @submit.prevent="submitCreateAcc" class="space-y-3">
          <div>
            <label class="form-label">ACC Document Template *</label>
            <select v-model="accForm.document_template_id" required class="form-input text-xs">
              <option v-for="t in accTemplates" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.code }}) {{ t.is_default ? '★ DEFAULT' : '' }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Nomor Subscription *</label>
            <input v-model="accForm.subscription_number" required class="form-input text-xs font-mono" />
          </div>
          <div>
            <label class="form-label">Nomor Kontrak</label>
            <input v-model="accForm.contract_number" class="form-input text-xs font-mono" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="form-label">Tanggal Aktivasi</label>
              <input type="date" v-model="accForm.activation_date" class="form-input text-xs" />
            </div>
            <div>
              <label class="form-label">Mulai Billing</label>
              <input type="date" v-model="accForm.start_billing_date" class="form-input text-xs" />
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showAccModal = false" class="btn-secondary text-xs">Batal</button>
            <button type="submit" class="btn-primary text-xs">Buat ACC & Lanjutkan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus Detail -->
    <div
      v-if="showDetailDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="showDetailDeleteModal = false"
    >
      <div class="card max-w-md w-full p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl space-y-4">
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
            <Trash2Icon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Hapus IWO {{ iwo?.iwo_no }}</h3>
            <p class="text-xs text-slate-500">Tindakan ini permanen.</p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300">
          Apakah Anda yakin ingin menghapus Work Order ini? Semua data relasi (milestone, network, perangkat) akan ikut terhapus dari sistem.
        </p>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button type="button" @click="showDetailDeleteModal = false" class="btn-secondary text-xs px-4 py-2">
            Batal
          </button>
          <button
            type="button"
            @click="confirmDetailDelete"
            :disabled="actionLoading"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
          >
            {{ actionLoading ? 'Menghapus...' : 'Ya, Hapus IWO' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Arsip Detail -->
    <div
      v-if="showDetailArchiveModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="showDetailArchiveModal = false"
    >
      <div class="card max-w-md w-full p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl space-y-4">
        <div class="flex items-center gap-3 text-purple-600 dark:text-purple-400">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center flex-shrink-0">
            <ArchiveIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              {{ iwo?.is_archived ? 'Pulihkan IWO dari Arsip' : 'Arsipkan IWO' }}
            </h3>
            <p class="text-xs text-slate-500">Ubah status arsip work order.</p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300">
          {{ iwo?.is_archived ? 'Kembalikan IWO ini ke daftar IWO aktif?' : 'Pindahkan IWO ini ke arsip dokumen?' }}
        </p>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button type="button" @click="showDetailArchiveModal = false" class="btn-secondary text-xs px-4 py-2">
            Batal
          </button>
          <button
            type="button"
            @click="confirmDetailArchive"
            :disabled="actionLoading"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm"
          >
            {{ actionLoading ? 'Memproses...' : (iwo?.is_archived ? 'Ya, Pulihkan' : 'Ya, Arsipkan') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../api/index.js'
import { useAuthStore } from '../../stores/auth.js'
import {
  ArrowLeft as ArrowLeftIcon,
  CalendarDays as CalendarIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  ChevronDown as ChevronDownIcon,
  FileText as FileTextIcon,
  CheckSquare as CheckSquareIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Trash2 as Trash2Icon,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const iwo = ref(null)
const loading = ref(false)
const showDetailDeleteModal = ref(false)
const showDetailArchiveModal = ref(false)
const actionLoading = ref(false)
const showAddMilestone = ref(false)
const savingMilestone = ref(false)
const expandedMilestoneId = ref(null)
const newMilestone = ref({ name: '', description: '', due_date: '' })

const networkForm = ref({})
const bastTemplates = ref([])
const accTemplates = ref([])

const showBastModal = ref(false)
const bastForm = ref({ document_template_id: '', active_date: '', notes: '' })

const showAccModal = ref(false)
const accForm = ref({
  document_template_id: '',
  subscription_number: '',
  contract_number: '',
  activation_date: '',
  start_billing_date: '',
})

const completedMilestones = computed(() => (iwo.value?.milestones || []).filter((ms) => ms.status === 'DONE').length)
const totalMilestones = computed(() => (iwo.value?.milestones || []).length)
const canChangeStatus = computed(() => authStore.hasRole('ADMINISTRATOR', 'MANAGEMENT', 'ENGINEER'))
const milestoneProgress = computed(() => {
  return Math.min(100, Math.max(0, Number(iwo.value?.progress || 0)))
})

function getStatusBadgeClass(st) {
  if (st === 'COMPLETED') return 'badge-active'
  if (st === 'PENDING') return 'badge-draft'
  if (st === 'CANCELLED') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
  if (st === 'IN_PROGRESS' || st === 'ACTIVATION') return 'badge-info'
  if (st === 'BAST' || st === 'ACC') return 'badge-purple'
  return 'badge-inactive'
}

function getStatusLabel(status) {
  return status === 'CANCELLED' ? 'CANCEL' : status
}

function formatWeight(weight) {
  return Number(weight || 0).toString()
}

function getMilestoneStatusLabel(status) {
  const labels = {
    PENDING: 'BELUM MULAI',
    IN_PROGRESS: 'BERJALAN',
    DONE: 'SELESAI',
    SKIPPED: 'DILEWATI',
  }
  return labels[status] || status
}

function getMilestoneStatusClass(status) {
  const classes = {
    PENDING: 'border-amber-700/70 bg-amber-950/30 text-amber-300',
    IN_PROGRESS: 'border-blue-700/70 bg-blue-950/30 text-blue-300',
    DONE: 'border-emerald-700/70 bg-emerald-950/30 text-emerald-300',
    SKIPPED: 'border-slate-600 bg-slate-800 text-slate-300',
  }
  return classes[status] || 'border-slate-600 bg-slate-800 text-slate-300'
}

function toggleMilestone(milestoneId) {
  expandedMilestoneId.value = expandedMilestoneId.value === milestoneId ? null : milestoneId
}

async function loadIwo() {
  loading.value = true
  try {
    const res = await api.get(`/iwo/${route.params.id}`)
    iwo.value = res.data.data
    iwo.value.milestones = (iwo.value.milestones || []).map((milestone) => ({
      ...milestone,
      weight: Number(milestone.weight || 0),
      completed_at: milestone.completed_at ? milestone.completed_at.slice(0, 10) : '',
    }))
    networkForm.value = { ...(iwo.value.networkInfo || {}) }
    window.dispatchEvent(new CustomEvent('iwo:updated', {
      detail: {
        id: iwo.value.id,
        progress: iwo.value.progress,
        status: iwo.value.status,
      },
    }))
  } catch (err) {
    console.error('Failed to load IWO:', err)
  } finally {
    loading.value = false
  }
}

async function updateIwoStatus(status) {
  actionLoading.value = true
  try {
    await api.patch(`/iwo/${iwo.value.id}/status`, { status })
    await loadIwo()
  } catch (err) {
    alert('Gagal mengubah status IWO: ' + (err.response?.data?.message || err.message))
    await loadIwo()
  } finally {
    actionLoading.value = false
  }
}

async function loadTemplates() {
  try {
    const [bRes, aRes] = await Promise.all([
      api.get('/document-templates', { params: { document_type: 'BAST', is_active: 'true' } }),
      api.get('/document-templates', { params: { document_type: 'ACC', is_active: 'true' } }),
    ])
    bastTemplates.value = bRes.data.data
    accTemplates.value = aRes.data.data

    const defBast = bastTemplates.value.find((t) => t.is_default) || bastTemplates.value[0]
    if (defBast) bastForm.value.document_template_id = defBast.id

    const defAcc = accTemplates.value.find((t) => t.is_default) || accTemplates.value[0]
    if (defAcc) accForm.value.document_template_id = defAcc.id
  } catch (err) {
    console.error('Failed to load templates:', err)
  }
}

async function saveNetwork() {
  try {
    await api.put(`/iwo/${iwo.value.id}/network`, networkForm.value)
    alert('Konfigurasi network berhasil disimpan')
  } catch (err) {
    alert('Gagal menyimpan network')
  }
}

function formatMilestoneDate(value) {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function saveMilestone(milestone) {
  savingMilestone.value = true
  milestone.status = 'DONE'
  try {
    await api.patch(`/iwo/${iwo.value.id}/milestones/${milestone.id}`, {
      name: milestone.name,
      description: milestone.description || '',
      due_date: milestone.due_date || '',
    })
    await loadIwo()
  } catch (err) {
    alert('Gagal menyimpan milestone: ' + (err.response?.data?.message || err.message))
    await loadIwo()
  } finally {
    savingMilestone.value = false
  }
}

async function addMilestone() {
  savingMilestone.value = true
  try {
    await api.post(`/iwo/${iwo.value.id}/milestones`, {
      ...newMilestone.value,
    })
    newMilestone.value = { name: '', description: '', due_date: '' }
    showAddMilestone.value = false
    await loadIwo()
  } catch (err) {
    alert('Gagal menambahkan milestone: ' + (err.response?.data?.message || err.message))
  } finally {
    savingMilestone.value = false
  }
}

async function deleteMilestone(milestone) {
  if (!confirm(`Hapus tahapan "${milestone.name}"?`)) return
  savingMilestone.value = true
  try {
    await api.delete(`/iwo/${iwo.value.id}/milestones/${milestone.id}`)
    await loadIwo()
  } catch (err) {
    alert('Gagal menghapus milestone: ' + (err.response?.data?.message || err.message))
  } finally {
    savingMilestone.value = false
  }
}

function openAddDeviceModal() {
  const name = prompt('Nama Perangkat:')
  if (!name) return
  const serial = prompt('Serial Number:') || ''
  api.post(`/iwo/${iwo.value.id}/devices`, { name, serial_number: serial, quantity: 1 }).then(loadIwo)
}

function deleteDevice(id) {
  if (confirm('Hapus perangkat ini?')) {
    api.delete(`/iwo/${iwo.value.id}/devices/${id}`).then(loadIwo)
  }
}

function openCreateBastModal() {
  bastForm.value.active_date = new Date().toISOString().split('T')[0]
  showBastModal.value = true
}

async function submitCreateBast() {
  try {
    const res = await api.post('/bast', {
      iwo_id: iwo.value.id,
      ...bastForm.value,
    })
    showBastModal.value = false
    router.push(`/bast/${res.data.data.id}`)
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal membuat BAST')
  }
}

function openCreateAccModal() {
  accForm.value.subscription_number = `SUB-${iwo.value.iwo_no.replace(/[/\\?%*:|"<>]/g, '')}`
  accForm.value.activation_date = new Date().toISOString().split('T')[0]
  accForm.value.start_billing_date = new Date().toISOString().split('T')[0]
  showAccModal.value = true
}

async function submitCreateAcc() {
  try {
    const res = await api.post('/acc', {
      iwo_id: iwo.value.id,
      bast_id: iwo.value.bast?.id,
      ...accForm.value,
    })
    showAccModal.value = false
    router.push(`/acc/${res.data.data.id}`)
  } catch (err) {
    alert(err.response?.data?.message || 'Gagal membuat ACC')
  }
}

async function confirmDetailDelete() {
  actionLoading.value = true
  try {
    await api.delete(`/iwo/${iwo.value.id}`)
    showDetailDeleteModal.value = false
    router.push('/iwo')
  } catch (err) {
    alert('Gagal menghapus IWO: ' + (err.response?.data?.message || err.message))
  } finally {
    actionLoading.value = false
  }
}

async function confirmDetailArchive() {
  actionLoading.value = true
  const newState = !iwo.value.is_archived
  try {
    await api.patch(`/iwo/${iwo.value.id}/archive`, { is_archived: newState })
    showDetailArchiveModal.value = false
    await loadIwo()
  } catch (err) {
    alert('Gagal mengubah status arsip: ' + (err.response?.data?.message || err.message))
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  await loadIwo()
  await loadTemplates()
})
</script>

<style scoped>
.milestone-scroll {
  scrollbar-width: thin;
  scrollbar-color: #475569 transparent;
}

.milestone-scroll::-webkit-scrollbar {
  width: 6px;
}

.milestone-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: #475569;
}
</style>
