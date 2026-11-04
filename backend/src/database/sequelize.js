import { Sequelize } from 'sequelize';
import config from '../config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageDir = path.resolve(process.cwd(), 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const sequelize = new Sequelize({
  dialect: config.db.dialect,
  storage: path.resolve(process.cwd(), config.db.storage),
  logging: config.db.logging,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export default sequelize;
