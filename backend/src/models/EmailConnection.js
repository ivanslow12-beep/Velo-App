import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class EmailConnection extends Model {}

EmailConnection.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  provider: {
    type: DataTypes.ENUM('GMAIL', 'OUTLOOK', 'CUSTOM'),
    allowNull: false,
  },
  email_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  auth_type: {
    type: DataTypes.ENUM('OAUTH2', 'PASSWORD'),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  oauth_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imap_host: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imap_port: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  imap_secure: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  smtp_host: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  smtp_port: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  smtp_secure: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  folder: {
    type: DataTypes.STRING,
    defaultValue: 'INBOX',
  },
  sync_interval: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Sync interval in minutes',
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ERROR'),
    defaultValue: 'INACTIVE',
  },
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_sync_uid: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  last_sync_uid_validity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  last_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'EmailConnection',
  tableName: 'email_connections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default EmailConnection;
