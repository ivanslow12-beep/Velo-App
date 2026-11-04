import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class IwoMilestone extends Model {}

IwoMilestone.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  iwo_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'iwos', key: 'id' },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'),
    defaultValue: 'PENDING',
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'IwoMilestone',
  tableName: 'iwo_milestones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default IwoMilestone;
