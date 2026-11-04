/**
 * models/index.js
 * Central registry: initialises all Sequelize models and wires up associations.
 */

import sequelize from '../database/sequelize.js';

// ── Model imports ─────────────────────────────────────────────────────────────
import User            from './User.js';
import Customer        from './Customer.js';
import Service         from './Service.js';
import IWO             from './IWO.js';
import IwoMilestone    from './IwoMilestone.js';
import NetworkInfo     from './NetworkInfo.js';
import Device          from './Device.js';
import SlaInfo         from './SlaInfo.js';
import DocumentTemplate from './DocumentTemplate.js';
import DocumentVersion  from './DocumentVersion.js';
import BAST            from './BAST.js';
import BastApproval    from './BastApproval.js';
import ACC             from './ACC.js';
import AccEquipment    from './AccEquipment.js';
import AccRequirement  from './AccRequirement.js';
import EmailConnection from './EmailConnection.js';
import EmailMessage    from './EmailMessage.js';
import EmailRule       from './EmailRule.js';
import Attachment      from './Attachment.js';
import AuditLog        from './AuditLog.js';
import Notification    from './Notification.js';
import IwoExcelImport  from './IwoExcelImport.js';

// ── Associations ──────────────────────────────────────────────────────────────

// ---- IWO ↔ Customer / Service ------------------------------------------------
IWO.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(IWO,   { foreignKey: 'customer_id', as: 'iwos' });

IWO.belongsTo(Service,  { foreignKey: 'service_id',  as: 'service' });
Service.hasMany(IWO,    { foreignKey: 'service_id',  as: 'iwos' });

// ---- IWO ↔ User (sales / engineer / createdByUser / updatedByUser) -----------
IWO.belongsTo(User, { foreignKey: 'sales_id',    as: 'sales' });
IWO.belongsTo(User, { foreignKey: 'engineer_id', as: 'engineer' });
IWO.belongsTo(User, { foreignKey: 'created_by',  as: 'createdByUser' });
IWO.belongsTo(User, { foreignKey: 'updated_by',  as: 'updatedByUser' });

User.hasMany(IWO, { foreignKey: 'sales_id',    as: 'salesIwos' });
User.hasMany(IWO, { foreignKey: 'engineer_id', as: 'engineerIwos' });

// ---- IWO ↔ IwoMilestone -------------------------------------------------------
IWO.hasMany(IwoMilestone,       { foreignKey: 'iwo_id', as: 'milestones' });
IwoMilestone.belongsTo(IWO,     { foreignKey: 'iwo_id', as: 'iwo' });
IwoMilestone.belongsTo(User,    { foreignKey: 'completed_by', as: 'completedByUser' });

// ---- IWO ↔ Device -------------------------------------------------------------
IWO.hasMany(Device,    { foreignKey: 'iwo_id', as: 'devices' });
Device.belongsTo(IWO,  { foreignKey: 'iwo_id', as: 'iwo' });

// ---- IWO ↔ NetworkInfo (1-to-1) -----------------------------------------------
IWO.hasOne(NetworkInfo,         { foreignKey: 'iwo_id', as: 'networkInfo' });
NetworkInfo.belongsTo(IWO,      { foreignKey: 'iwo_id', as: 'iwo' });

// ---- IWO ↔ SlaInfo (1-to-1) ---------------------------------------------------
IWO.hasOne(SlaInfo,    { foreignKey: 'iwo_id', as: 'slaInfo' });
SlaInfo.belongsTo(IWO, { foreignKey: 'iwo_id', as: 'iwo' });

// ---- IWO ↔ BAST (1-to-1) ------------------------------------------------------
IWO.hasOne(BAST,    { foreignKey: 'iwo_id', as: 'bast' });
BAST.belongsTo(IWO, { foreignKey: 'iwo_id', as: 'iwo' });

// ---- BAST ↔ DocumentTemplate / DocumentVersion --------------------------------
BAST.belongsTo(DocumentTemplate, { foreignKey: 'document_template_id', as: 'documentTemplate' });
BAST.belongsTo(DocumentVersion,  { foreignKey: 'template_version_id',  as: 'templateVersion' });
BAST.belongsTo(User,             { foreignKey: 'generated_by',         as: 'generatedByUser' });
BAST.belongsTo(User,             { foreignKey: 'created_by',           as: 'createdByUser' });
BAST.belongsTo(User,             { foreignKey: 'updated_by',           as: 'updatedByUser' });

// ---- BAST ↔ BastApproval -------------------------------------------------------
BAST.hasMany(BastApproval,        { foreignKey: 'bast_id', as: 'approvals' });
BastApproval.belongsTo(BAST,      { foreignKey: 'bast_id', as: 'bast' });
BastApproval.belongsTo(User,      { foreignKey: 'user_id', as: 'approver' });

// ---- IWO ↔ ACC (1-to-1) -------------------------------------------------------
IWO.hasOne(ACC,    { foreignKey: 'iwo_id', as: 'acc' });
ACC.belongsTo(IWO, { foreignKey: 'iwo_id', as: 'iwo' });

// ---- ACC ↔ BAST ---------------------------------------------------------------
ACC.belongsTo(BAST, { foreignKey: 'bast_id', as: 'bast' });
BAST.hasOne(ACC,    { foreignKey: 'bast_id', as: 'acc' });

// ---- ACC ↔ DocumentTemplate / DocumentVersion ---------------------------------
ACC.belongsTo(DocumentTemplate, { foreignKey: 'document_template_id', as: 'documentTemplate' });
ACC.belongsTo(DocumentVersion,  { foreignKey: 'template_version_id',  as: 'templateVersion' });
ACC.belongsTo(User,             { foreignKey: 'generated_by',         as: 'generatedByUser' });
ACC.belongsTo(User,             { foreignKey: 'created_by',           as: 'createdByUser' });
ACC.belongsTo(User,             { foreignKey: 'updated_by',           as: 'updatedByUser' });

// ---- ACC ↔ AccEquipment / AccRequirement --------------------------------------
ACC.hasMany(AccEquipment,         { foreignKey: 'acc_id', as: 'equipments' });
AccEquipment.belongsTo(ACC,       { foreignKey: 'acc_id', as: 'acc' });

ACC.hasMany(AccRequirement,       { foreignKey: 'acc_id', as: 'requirements' });
AccRequirement.belongsTo(ACC,     { foreignKey: 'acc_id', as: 'acc' });

// ---- DocumentTemplate ↔ DocumentVersion ----------------------------------------
DocumentTemplate.hasMany(DocumentVersion, { foreignKey: 'document_template_id', as: 'versions' });
DocumentVersion.belongsTo(DocumentTemplate, { foreignKey: 'document_template_id', as: 'template' });
DocumentVersion.belongsTo(User, { foreignKey: 'activated_by', as: 'activatedByUser' });
DocumentVersion.belongsTo(User, { foreignKey: 'created_by',   as: 'createdByUser' });

// ---- DocumentTemplate ↔ User --------------------------------------------------
DocumentTemplate.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });
DocumentTemplate.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedByUser' });

// ---- EmailConnection ↔ EmailMessage / EmailRule --------------------------------
EmailConnection.hasMany(EmailMessage, { foreignKey: 'email_connection_id', as: 'messages' });
EmailMessage.belongsTo(EmailConnection, { foreignKey: 'email_connection_id', as: 'connection' });

EmailConnection.hasMany(EmailRule, { foreignKey: 'email_connection_id', as: 'rules' });
EmailRule.belongsTo(EmailConnection, { foreignKey: 'email_connection_id', as: 'connection' });

// ---- EmailMessage ↔ IWO -------------------------------------------------------
EmailMessage.belongsTo(IWO, { foreignKey: 'iwo_id', as: 'iwo' });
IWO.hasMany(EmailMessage,   { foreignKey: 'iwo_id', as: 'emailMessages' });

// ---- EmailRule ↔ User ---------------------------------------------------------
EmailRule.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// ---- EmailConnection ↔ User ---------------------------------------------------
EmailConnection.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });
EmailConnection.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedByUser' });

// ---- AuditLog ↔ User (actor) --------------------------------------------------
AuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });
User.hasMany(AuditLog,   { foreignKey: 'actor_id', as: 'auditLogs' });

// ---- Notification ↔ User ------------------------------------------------------
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification,   { foreignKey: 'user_id', as: 'notifications' });

// ---- IwoExcelImport ↔ User ----------------------------------------------------
IwoExcelImport.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// ── Exports ───────────────────────────────────────────────────────────────────
export {
  sequelize,
  User,
  Customer,
  Service,
  IWO,
  IwoMilestone,
  NetworkInfo,
  Device,
  SlaInfo,
  DocumentTemplate,
  DocumentVersion,
  BAST,
  BastApproval,
  ACC,
  AccEquipment,
  AccRequirement,
  EmailConnection,
  EmailMessage,
  EmailRule,
  Attachment,
  AuditLog,
  Notification,
  IwoExcelImport,
};
