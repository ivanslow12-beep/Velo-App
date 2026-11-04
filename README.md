# VELO Internal Work Order (IWO) Management System
## With BAST & ACC Document Template Management

Sistem Manajemen Internal Work Order (IWO) terintegrasi dengan modul BAST & ACC Document Template Management untuk PT VELO Media Interkoneksi.

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat
- **Node.js**: v18+ (direkomendasikan v20+)
- **NPM**: v9+

---

### 2. Menjalankan Backend API

```bash
cd backend
npm install
npm run migrate
npm run seed
npm start
```

Backend API akan berjalan di: `http://localhost:3000`

---

### 3. Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikasi web akan terbuka di: `http://localhost:5173`

*(Catatan: Bundle produksi frontend yang telah dikompilasi juga tersedia di dalam direktori `frontend/dist`).*

---

## 👥 Akun Demo & RBAC

| Role | Email | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **ADMINISTRATOR** | `ivan.naga@velo.co.id` | `Admin@123` | Kelola Template BAST & ACC, Master Data, RBAC, IWO, Konfigurasi |
| **ADMINISTRATOR** | `admin@velo.id` | `Admin@123` | Kelola Template, Users, Audit Logs, Settings |
| **MANAGEMENT** | `management@velo.id` | `Mgmt@123` | Monitoring Dashboard, Laporan, Approval BAST tingkat Manajerial |
| **ENGINEER** | `fulfillment@velo.co.id` | `Engr@123` | Pelaksanaan Instalasi, Milestone, Input Data BAST & Perangkat |
| **SALES** | `sales@velo.id` | `Sales@123` | Buat IWO, Verifikasi Kontrak ACC, Approval BAST Sales |

---

## 📑 Fitur Baru: BAST & ACC Document Template Management

### 1. Menu Navigasi
Akses menu: **Administration → Document Templates** (`/administration/document-templates`).

### 2. Kemampuan Modul
- **Dua Tipe Dokumen**: Mendukung template **BAST** dan **ACC**.
- **Visual Template Editor**:
  - Kolom Kiri: Palet Komponen Reusable (*Heading, Paragraph, Field Pair, Dynamic Table, Requirements Table, Approval Block, Divider*).
  - Kolom Tengah: Document Canvas interaktif dengan reordering and preview visual.
  - Kolom Kanan: Properties Komponen & **Searchable Whitelisted Placeholder Catalog** (*IWO, Customer, Service, Network, Devices, SLA, Approvals, ACC*).
- **Keamanan Placeholder Engine**:
  - Menggunakan whitelist aman (Safe Placeholder Whitelist).
  - Mencegah eksekusi arbitrary code (PHP, JS, SQL, Shell execution blocked).
  - Fitur **Validate Template** dengan deteksi typo dan rekomendasi otomatis (fuzzy matching).
- **Versioning & Siklus Hidup**:
  - Status: `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`.
  - Pembuatan versi baru bercabang (contoh: `1.0` -> `1.1` -> `2.0`).
  - Duplikasi template (`Duplicate`) dengan penetapan kode & nama baru.
  - **Set as Default** terpisah per tipe dokumen (BAST default & ACC default).
- **Immutabilitas Dokumen Historis (Critical)**:
  - Setiap dokumen BAST dan ACC yang digenerasi mencatat `document_template_id` dan `template_version_id`.
  - Dokumen masa lalu tidak akan pernah berubah secara retroaktif saat template diubah atau diperbarui.
- **Live Preview & Sample Data**:
  - Preview dengan data riil IWO/BAST/ACC terpilih atau mode **SAMPLE PREVIEW DATA** yang diberi label khusus.
- **Full Audit Logging**:
  - Setiap tindakan pembuatan, revisi, aktivasi, dan perubahan template dicatat ke tabel Audit Log beserta actor, timestamp, dan diff data.

---

## 🧪 Menjalankan Automated Tests

Backend dilengkapi rangkaian unit dan end-to-end integration tests (16 automated tests):

```bash
cd backend
node --test src/tests/*.test.js
```

Rangkaian pengujian mencakup:
1. Placeholder Catalog & Whitelist security verification
2. Valid & Invalid placeholder validation with correction suggestions
3. Create BAST & ACC Templates (Initial DRAFT version)
4. Template version branching, editing, activation & immutability checks
5. Template duplication & default selection isolation
6. Sample data preview rendering
7. **Critical Flow**: BAST Generation & Historical Version Preservation
8. **Critical Flow**: ACC Generation & Customer Approval Simulation
9. Audit Log compliance
10. **E2E Workflow**: IWO -> BAST -> Template Selection -> Approval -> Generation -> ACC -> Customer Approval -> IWO Closed.
