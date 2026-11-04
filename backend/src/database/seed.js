/**
 * Database Seeder
 *
 * Creates baseline records for:
 *  - Users (ADMINISTRATOR, MANAGEMENT, ENGINEER, SALES)
 *  - Customers
 *  - Services
 *  - DocumentTemplates + Versions (BAST default, ACC default)
 */

import sequelize from './sequelize.js';
import { User, Customer, Service, DocumentTemplate, DocumentVersion } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { BAST_CONTENT, ACC_CONTENT } from '../config/defaultTemplates.js';

const hash = (pw) => bcrypt.hash(pw, 12);

async function seedUsers() {
  const users = [
    { name: 'ivan', email: 'ivan.naga@velo.co.id', password: 'Admin@123', role: 'ADMINISTRATOR' },
    { name: 'Administrator', email: 'admin@velo.id', password: 'Admin@123', role: 'ADMINISTRATOR' },
    { name: 'Management', email: 'management@velo.id', password: 'Mgmt@123', role: 'MANAGEMENT' },
    { name: 'Fullfilment', email: 'fulfillment@velo.co.id', password: 'Engr@123', role: 'ENGINEER' },
    { name: 'Engineer VELO', email: 'engineer@velo.id', password: 'Engr@123', role: 'ENGINEER' },
    { name: 'Sales VELO', email: 'sales@velo.id', password: 'Sales@123', role: 'SALES' },
  ];

  const createdUsers = {};
  for (const u of users) {
    const [user, created] = await User.findOrCreate({
      where: { email: u.email },
      defaults: {
        name: u.name,
        password: await hash(u.password),
        role: u.role,
        is_active: true,
      },
    });
    createdUsers[u.role] = user;
    console.log(`  User [${u.role}] ${u.email} — ${created ? 'created' : 'already exists'}`);
  }
  return createdUsers;
}

async function seedCustomers() {
  const customers = [
    {
      name: 'PT Maju Bersama Nusantara',
      code: 'CUST-001',
      address: 'Jl. Sudirman Kav 25, Menara Mandiri Lt. 12, Jakarta Pusat',
      contact_name: 'Budi Santoso',
      email: 'budi@majubersama.co.id',
      phone: '021-5551234',
    },
    {
      name: 'CV Teknologi Nusantara Sakti',
      code: 'CUST-002',
      address: 'Jl. Gatot Subroto No. 22, Graha Pos Lt. 3, Bandung',
      contact_name: 'Siti Rahayu',
      email: 'siti@teknologinusantara.com',
      phone: '022-8765432',
    },
    {
      name: 'PT Solusi Digital Mega Indonesia',
      code: 'CUST-003',
      address: 'Jl. Pemuda No. 45, Intiland Tower Lt. 8, Surabaya',
      contact_name: 'Andi Wijaya',
      email: 'andi@solusidi.id',
      phone: '031-9988776',
    },
  ];

  for (const c of customers) {
    const [, created] = await Customer.findOrCreate({
      where: { code: c.code },
      defaults: c,
    });
    console.log(`  Customer ${c.code} — ${created ? 'created' : 'already exists'}`);
  }
}

async function seedServices() {
  const services = [
    {
      name: 'Dedicated Internet Access 50 Mbps 1:1',
      description: 'Layanan internet dedicated simetris rasio 1:1 dengan garansi SLA 99.8%',
      price: 6500000,
    },
    {
      name: 'Dedicated Internet Access 100 Mbps 1:1',
      description: 'Layanan internet dedicated korporasi kapasitas tinggi simetris SLA 99.9%',
      price: 11000000,
    },
    {
      name: 'Metro Ethernet Point-to-Point 1 Gbps',
      description: 'Koneksi lokal antar gedung low latency via fiber optic private circuit',
      price: 22000000,
    },
  ];

  for (const s of services) {
    const [, created] = await Service.findOrCreate({
      where: { name: s.name },
      defaults: s,
    });
    console.log(`  Service ${s.name} — ${created ? 'created' : 'already exists'}`);
  }
}

async function seedDocumentTemplates(adminUser) {
  const adminId = adminUser?.id;

  // --- BAST Template ---
  let [bastTemplate, bastCreated] = await DocumentTemplate.findOrCreate({
    where: { code: 'BAST-DEFAULT' },
    defaults: {
      name: 'BAST Standard VELO',
      code: 'BAST-DEFAULT',
      document_type: 'BAST',
      description: 'Template Berita Acara Serah Terima Standar PT VELO Media Interkoneksi',
      is_active: true,
      is_default: true,
      created_by: adminId,
    },
  });
  console.log(`  DocumentTemplate BAST-DEFAULT — ${bastCreated ? 'created' : 'already exists'}`);

  const bastVersion = await DocumentVersion.findOne({
    where: { document_template_id: bastTemplate.id, version: '1.0' },
  });
  if (!bastVersion) {
    await DocumentVersion.create({
      document_template_id: bastTemplate.id,
      version: '1.0',
      status: 'ACTIVE',
      content: JSON.stringify(BAST_CONTENT),
      is_current: true,
      created_by: adminId,
      activated_by: adminId,
      activated_at: new Date(),
    });
    console.log('    DocumentVersion BAST v1.0 (ACTIVE) — created');
  }

  // --- ACC Template ---
  let [accTemplate, accCreated] = await DocumentTemplate.findOrCreate({
    where: { code: 'ACC-DEFAULT' },
    defaults: {
      name: 'ACC Standard VELO',
      code: 'ACC-DEFAULT',
      document_type: 'ACC',
      description: 'Template Activation & Closing Confirmation Standar PT VELO Media Interkoneksi',
      is_active: true,
      is_default: true,
      created_by: adminId,
    },
  });
  console.log(`  DocumentTemplate ACC-DEFAULT — ${accCreated ? 'created' : 'already exists'}`);

  const accVersion = await DocumentVersion.findOne({
    where: { document_template_id: accTemplate.id, version: '1.0' },
  });
  if (!accVersion) {
    await DocumentVersion.create({
      document_template_id: accTemplate.id,
      version: '1.0',
      status: 'ACTIVE',
      content: JSON.stringify(ACC_CONTENT),
      is_current: true,
      created_by: adminId,
      activated_by: adminId,
      activated_at: new Date(),
    });
    console.log('    DocumentVersion ACC v1.0 (ACTIVE) — created');
  }
}

const seed = async () => {
  try {
    await sequelize.authenticate();

    console.log('\n🌱 Seeding VELO IWO database...\n');

    console.log('👤 Users:');
    const users = await seedUsers();

    console.log('\n🏢 Customers:');
    await seedCustomers();

    console.log('\n📦 Services:');
    await seedServices();

    console.log('\n📄 Document Templates:');
    await seedDocumentTemplates(users['ADMINISTRATOR']);

    console.log('\n✅ Seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
};

export default seed;

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seed.js')) {
  seed();
}
