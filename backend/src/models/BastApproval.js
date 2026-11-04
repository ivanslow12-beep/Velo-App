import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class BastApproval extends Model {}

BastApproval.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  bast_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'basts', key: 'id' },
  },
  role: {
    type: DataTypes.ENUM(
      'ENGINEER',
      'SALES',
      'FULFILMENT',
      'MANAGER_MON',
      'MANAGER_INDUSTRY',
      'HEAD_OSS'
    ),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'BastApproval',
  tableName: 'bast_approvals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default BastApproval;
