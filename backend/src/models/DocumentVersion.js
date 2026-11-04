import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class DocumentVersion extends Model {}

DocumentVersion.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  document_template_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'document_templates', key: 'id' },
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. "1.0"',
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'),
    defaultValue: 'DRAFT',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON schema of template layout',
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  activated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'DocumentVersion',
  tableName: 'document_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default DocumentVersion;
