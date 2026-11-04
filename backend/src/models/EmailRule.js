import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class EmailRule extends Model {}

EmailRule.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  email_connection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'email_connections', key: 'id' },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  condition_field: {
    type: DataTypes.ENUM('FROM', 'SUBJECT', 'TO', 'BODY'),
    allowNull: false,
  },
  condition_operator: {
    type: DataTypes.ENUM('CONTAINS', 'EQUALS', 'STARTS_WITH'),
    allowNull: false,
  },
  condition_value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('LINK_IWO', 'MARK_READ', 'SKIP'),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'EmailRule',
  tableName: 'email_rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default EmailRule;
