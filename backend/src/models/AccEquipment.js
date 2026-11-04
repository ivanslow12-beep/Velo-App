import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class AccEquipment extends Model {}

AccEquipment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  acc_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'accs', key: 'id' },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'AccEquipment',
  tableName: 'acc_equipments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default AccEquipment;
