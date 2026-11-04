import sequelize from './sequelize.js';
import '../models/index.js'; // registers all models with Sequelize

const IWO_NEW_COLUMNS = [
  ['customer_name_manual', 'VARCHAR(255)'],
  ['customer_contact_person', 'VARCHAR(255)'],
  ['customer_phone', 'VARCHAR(255)'],
  ['customer_email', 'VARCHAR(255)'],
  ['customer_address_manual', 'TEXT'],
  ['service_name_manual', 'VARCHAR(255)'],
  ['service_price', 'DECIMAL(15,2)'],
  ['sales_name_manual', 'VARCHAR(255)'],
  ['pic_project', 'VARCHAR(255)'],
  ['partner_1', 'VARCHAR(255)'],
  ['partner_2', 'VARCHAR(255)'],
  ['pop_or_standalone', 'VARCHAR(255)'],
  ['industry_sales', 'VARCHAR(255)'],
  ['is_archived', 'TINYINT(1) DEFAULT 0'],
];

const EMAIL_CONNECTION_NEW_COLUMNS = [
  ['last_sync_uid', 'INTEGER'],
  ['last_sync_uid_validity', 'VARCHAR(255)'],
];

const migrate = async () => {
  try {
    await sequelize.sync();

    // Ensure iwos table has the new columns if migrated from older schema
    const [cols] = await sequelize.query('PRAGMA table_info(iwos);');
    const existingCols = new Set(cols.map((c) => c.name));

    for (const [colName, colType] of IWO_NEW_COLUMNS) {
      if (!existingCols.has(colName)) {
        await sequelize.query(`ALTER TABLE iwos ADD COLUMN ${colName} ${colType};`);
        console.log(`  Added column iwos.${colName} (${colType})`);
      }
    }

    const [emailConnectionCols] = await sequelize.query('PRAGMA table_info(email_connections);');
    const existingEmailConnectionCols = new Set(emailConnectionCols.map((c) => c.name));

    for (const [colName, colType] of EMAIL_CONNECTION_NEW_COLUMNS) {
      if (!existingEmailConnectionCols.has(colName)) {
        await sequelize.query(`ALTER TABLE email_connections ADD COLUMN ${colName} ${colType};`);
        console.log(`  Added column email_connections.${colName} (${colType})`);
      }
    }

    console.log('Database migrated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
