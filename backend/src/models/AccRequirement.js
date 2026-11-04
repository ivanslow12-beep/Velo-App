import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class AccRequirement extends Model {}

AccRequirement.init({
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
  requirement: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  result: {
    type: DataTypes.ENUM('YES', 'NO', 'NA'),
    allowNull: true,
  },
  evidence_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'AccRequirement',
  tableName: 'acc_requirements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default AccRequirement;
