import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class IWO extends Model {}

IWO.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  iwo_no: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Auto-generated format: XXXXXX/VELO/IWO/[RomanMonth]/[YY] or manual input',
  },
  request_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  request_type: {
    type: DataTypes.ENUM(
      'NEW_INSTALLATION',
      'RELOCATION',
      'UPGRADE',
      'DOWNGRADE',
      'TERMINATION',
      'MAINTENANCE'
    ),
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'customers', key: 'id' },
  },
  // Manual / Hybrid Customer Details
  customer_name_manual: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_contact_person: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_address_manual: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  service_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'services', key: 'id' },
  },
  // Manual / Hybrid Service Details
  service_name_manual: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  service_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  sales_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  // Manual Sales Name & Industry
  sales_name_manual: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  industry_sales: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  engineer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  // Project PIC & Partner Details
  pic_project: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  partner_1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  partner_2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pop_or_standalone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL'),
    defaultValue: 'NORMAL',
  },
  status: {
    type: DataTypes.ENUM(
      'DRAFT',
      'PENDING',
      'IN_PROGRESS',
      'ACTIVATION',
      'BAST',
      'ACC',
      'COMPLETED',
      'CANCELLED',
      'OVERDUE',
      'ARCHIVED'
    ),
    defaultValue: 'DRAFT',
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 },
  },
  deadline_rfs: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sla_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_overdue: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
  modelName: 'IWO',
  tableName: 'iwos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default IWO;
