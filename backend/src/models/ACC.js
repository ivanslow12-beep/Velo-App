import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class ACC extends Model {}

ACC.init({
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
  bast_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'basts', key: 'id' },
  },
  subscription_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contract_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_id_ext: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  service_id_ext: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_id_ext: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  start_billing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  monthly_tariff: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  contract_period: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in months',
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'CUSTOMER_APPROVED', 'COMPLETED'),
    defaultValue: 'DRAFT',
  },
  email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  customer_approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  customer_signature_token: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
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
  pdf_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  generated_document_version: {
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
  modelName: 'ACC',
  tableName: 'accs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default ACC;
