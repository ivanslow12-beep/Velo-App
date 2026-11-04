import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class DocumentTemplate extends Model {}

DocumentTemplate.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  document_type: {
    type: DataTypes.ENUM('BAST', 'ACC'),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  effective_from: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  effective_to: {
    type: DataTypes.DATEONLY,
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
  modelName: 'DocumentTemplate',
  tableName: 'document_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default DocumentTemplate;
