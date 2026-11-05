import sequelize from './sequelize.js';
import '../models/index.js'; // registers all models with Sequelize
import { ensureIwoColumns } from './iwoSchema.js';

const EMAIL_CONNECTION_NEW_COLUMNS = [
  ['last_sync_uid', 'INTEGER'],
  ['last_sync_uid_validity', 'VARCHAR(255)'],
];

const MILESTONE_MATCH_SQL = (expression, keywords) => keywords
  .map((keyword) => `INSTR(LOWER(COALESCE(${expression}, '')), '${keyword}') > 0`)
  .join(' OR ');

const ACTIVATION_MATCH_SQL = MILESTONE_MATCH_SQL('name', ['aktivasi', 'act']);
const VLAN_MATCH_SQL = MILESTONE_MATCH_SQL('name', ['vlan', 'pelurusan']);
const PULLING_MATCH_SQL = MILESTONE_MATCH_SQL('name', ['penarikan', 'kabel', 'bb', 'backbone', 'fiber', 'fo', 'pulling']);
const GROUP_ONE_MATCH_SQL = MILESTONE_MATCH_SQL('name', ['survey', 'survei', 'surat izin', 'izin', 'deposit', 'supervisi']);
const GROUP_TWO_MATCH_SQL = MILESTONE_MATCH_SQL('name', ['barang', 'ip', 'perangkat', 'request']);

const MILESTONE_WEIGHT_SQL = `
  CASE
    WHEN ${ACTIVATION_MATCH_SQL} THEN 100
    WHEN ${VLAN_MATCH_SQL} THEN 80
    WHEN ${PULLING_MATCH_SQL} THEN 70
    WHEN ${GROUP_ONE_MATCH_SQL} THEN 10
    WHEN ${GROUP_TWO_MATCH_SQL} THEN 5
    ELSE 0
  END
`;

const MILESTONE_PROGRESS_SQL = (iwoId) => `
  CASE
    WHEN EXISTS (
      SELECT 1 FROM iwo_milestones
      WHERE iwo_id = ${iwoId} AND status = 'DONE' AND (${ACTIVATION_MATCH_SQL})
    ) THEN 100
    WHEN EXISTS (
      SELECT 1 FROM iwo_milestones
      WHERE iwo_id = ${iwoId} AND status = 'DONE' AND (${VLAN_MATCH_SQL})
    ) THEN 80
    WHEN EXISTS (
      SELECT 1 FROM iwo_milestones
      WHERE iwo_id = ${iwoId} AND status = 'DONE' AND (${PULLING_MATCH_SQL})
    ) THEN 70
    ELSE MIN(65, COALESCE((
      SELECT SUM(CASE
        WHEN ${ACTIVATION_MATCH_SQL} OR ${VLAN_MATCH_SQL} OR ${PULLING_MATCH_SQL} THEN 0
        WHEN ${GROUP_ONE_MATCH_SQL} THEN 10
        WHEN ${GROUP_TWO_MATCH_SQL} THEN 5
        ELSE 0
      END)
      FROM iwo_milestones
      WHERE iwo_id = ${iwoId} AND status = 'DONE'
    ), 0))
  END
`;

const migrate = async () => {
  try {
    await sequelize.sync();

    await ensureIwoColumns(sequelize);

    const [milestoneCols] = await sequelize.query('PRAGMA table_info(iwo_milestones);');
    const hasMilestoneWeight = milestoneCols.some((column) => column.name === 'weight');
    if (!hasMilestoneWeight) {
      await sequelize.query('ALTER TABLE iwo_milestones ADD COLUMN weight DECIMAL(5,2) NOT NULL DEFAULT 0;');
      console.log('  Added iwo_milestones.weight');
    }

    await sequelize.query(`UPDATE iwo_milestones SET weight = ${MILESTONE_WEIGHT_SQL};`);
    await sequelize.query(`
      UPDATE iwos
      SET progress = ${MILESTONE_PROGRESS_SQL('iwos.id')};
    `);
    await sequelize.query(`
      UPDATE iwos
      SET status = CASE
        WHEN status = 'CANCELLED' THEN status
        WHEN status_locked = 1 AND status = 'PENDING' THEN status
        WHEN progress >= 100 THEN 'COMPLETED'
        WHEN progress > 0 THEN 'IN_PROGRESS'
        WHEN status = 'DRAFT' THEN 'DRAFT'
        ELSE 'PENDING'
      END;
    `);

    await sequelize.query('DROP TRIGGER IF EXISTS iwo_milestones_progress_after_insert;');
    await sequelize.query('DROP TRIGGER IF EXISTS iwo_milestones_progress_after_update;');
    await sequelize.query('DROP TRIGGER IF EXISTS iwo_milestones_progress_after_delete;');

    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS iwo_milestones_progress_after_insert
      AFTER INSERT ON iwo_milestones
      BEGIN
        UPDATE iwo_milestones SET weight = ${MILESTONE_WEIGHT_SQL} WHERE id = NEW.id;
        UPDATE iwos SET progress = ${MILESTONE_PROGRESS_SQL('NEW.iwo_id')} WHERE id = NEW.iwo_id;
        UPDATE iwos SET status = CASE
          WHEN status = 'CANCELLED' THEN status
          WHEN status_locked = 1 AND status = 'PENDING' THEN status
          WHEN progress >= 100 THEN 'COMPLETED'
          WHEN progress > 0 THEN 'IN_PROGRESS'
          WHEN status = 'DRAFT' THEN 'DRAFT'
          ELSE 'PENDING'
        END WHERE id = NEW.iwo_id;
      END;
    `);
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS iwo_milestones_progress_after_update
      AFTER UPDATE OF name, status, iwo_id ON iwo_milestones
      BEGIN
        UPDATE iwo_milestones SET weight = ${MILESTONE_WEIGHT_SQL} WHERE id = NEW.id;
        UPDATE iwos SET progress = ${MILESTONE_PROGRESS_SQL('OLD.iwo_id')} WHERE id = OLD.iwo_id;
        UPDATE iwos SET status = CASE
          WHEN status = 'CANCELLED' THEN status
          WHEN status_locked = 1 AND status = 'PENDING' THEN status
          WHEN progress >= 100 THEN 'COMPLETED'
          WHEN progress > 0 THEN 'IN_PROGRESS'
          WHEN status = 'DRAFT' THEN 'DRAFT'
          ELSE 'PENDING'
        END WHERE id = OLD.iwo_id;
        UPDATE iwos SET progress = ${MILESTONE_PROGRESS_SQL('NEW.iwo_id')} WHERE id = NEW.iwo_id;
        UPDATE iwos SET status = CASE
          WHEN status = 'CANCELLED' THEN status
          WHEN status_locked = 1 AND status = 'PENDING' THEN status
          WHEN progress >= 100 THEN 'COMPLETED'
          WHEN progress > 0 THEN 'IN_PROGRESS'
          WHEN status = 'DRAFT' THEN 'DRAFT'
          ELSE 'PENDING'
        END WHERE id = NEW.iwo_id;
      END;
    `);
    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS iwo_milestones_progress_after_delete
      AFTER DELETE ON iwo_milestones
      BEGIN
        UPDATE iwos SET progress = ${MILESTONE_PROGRESS_SQL('OLD.iwo_id')} WHERE id = OLD.iwo_id;
        UPDATE iwos SET status = CASE
          WHEN status = 'CANCELLED' THEN status
          WHEN status_locked = 1 AND status = 'PENDING' THEN status
          WHEN progress >= 100 THEN 'COMPLETED'
          WHEN progress > 0 THEN 'IN_PROGRESS'
          WHEN status = 'DRAFT' THEN 'DRAFT'
          ELSE 'PENDING'
        END WHERE id = OLD.iwo_id;
      END;
    `);

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
