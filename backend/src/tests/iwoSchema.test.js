import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Sequelize } from 'sequelize';
import { ensureIwoColumns } from '../database/iwoSchema.js';

describe('IWO schema compatibility', () => {
  it('adds missing IWO columns to a legacy database and is safe to rerun', async () => {
    const database = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });

    try {
      await database.query('CREATE TABLE iwos (id TEXT PRIMARY KEY);');

      await ensureIwoColumns(database);
      await ensureIwoColumns(database);

      const [columns] = await database.query('PRAGMA table_info(iwos);');
      const columnNames = columns.map((column) => column.name);
      assert.ok(columnNames.includes('status_locked'));
      assert.ok(columnNames.includes('is_archived'));
      assert.equal(columns.filter((column) => column.name === 'status_locked').length, 1);
    } finally {
      await database.close();
    }
  });
});
