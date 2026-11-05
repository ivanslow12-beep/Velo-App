import sequelize from './sequelize.js';

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
  ['status_locked', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['is_archived', 'TINYINT(1) DEFAULT 0'],
];

export async function ensureIwoColumns(database = sequelize) {
  const [columns] = await database.query('PRAGMA table_info(iwos);');
  const existingColumns = new Set(columns.map((column) => column.name));

  for (const [columnName, columnType] of IWO_NEW_COLUMNS) {
    if (existingColumns.has(columnName)) continue;

    await database.query(`ALTER TABLE iwos ADD COLUMN ${columnName} ${columnType};`);
    existingColumns.add(columnName);
    console.log(`  Added column iwos.${columnName} (${columnType})`);
  }
}
