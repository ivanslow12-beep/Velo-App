import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class Attachment extends Model {}

Attachment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. IWO, BAST, ACC (polymorphic reference)',
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'UUID of the related entity (polymorphic)',
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  storage_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  document_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  document_template_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'document_templates', key: 'id' },
  },
  template_version_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'document_versions', key: 'id' },
  },
  generated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'Attachment',
  tableName: 'attachments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default Attachment;
