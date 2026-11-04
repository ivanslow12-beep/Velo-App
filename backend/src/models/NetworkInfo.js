import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize.js';
import { v4 as uuidv4 } from 'uuid';

class NetworkInfo extends Model {}

NetworkInfo.init({
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
  node_pop: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  connection_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pop_switch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  switch_port: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  router: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  wan_ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  public_ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  partner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  port: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  vlan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'NetworkInfo',
  tableName: 'network_infos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default NetworkInfo;
