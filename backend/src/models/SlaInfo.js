import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class SlaInfo extends Model {}

SlaInfo.init({
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
  availability: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bandwidth_guarantee: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_support_response: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hotline: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'SlaInfo',
  tableName: 'sla_infos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default SlaInfo;
