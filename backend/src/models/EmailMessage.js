import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class EmailMessage extends Model {}

EmailMessage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  email_connection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'email_connections', key: 'id' },
  },
  message_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique email message-id header',
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  from_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  from_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  to_addresses: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of recipient addresses',
  },
  body_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  body_html: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  iwo_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'iwos', key: 'id' },
  },
  folder: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'EmailMessage',
  tableName: 'email_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default EmailMessage;
