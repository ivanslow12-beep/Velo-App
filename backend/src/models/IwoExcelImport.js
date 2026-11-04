import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class IwoExcelImport extends Model {}

IwoExcelImport.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED'),
    defaultValue: 'PENDING',
  },
  total_rows: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  processed_rows: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  failed_rows: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  error_log: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  sequelize,
  modelName: 'IwoExcelImport',
  tableName: 'iwo_excel_imports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default IwoExcelImport;
