import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class BAST extends Model {}

BAST.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  iwo_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'iwos', key: 'id' },
  },
  bast_no: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  active_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'GENERATED'),
    defaultValue: 'DRAFT',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  outdoor_photo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  indoor_photo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  topology_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  speedtest_iix_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  speedtest_ix_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  speedtest_wifi_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  winbox_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mrtg_url: {
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
  generated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  generated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  generated_document_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  generated_document_version: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pdf_path: {
    type: DataTypes.STRING,
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
  modelName: 'BAST',
  tableName: 'basts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default BAST;
