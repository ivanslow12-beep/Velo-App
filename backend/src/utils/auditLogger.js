import { AuditLog } from '../models/index.js';

/**
 * Logs an audit event to the database.
 * Failures are silently swallowed so they never break the main request flow.
 *
 * @param {object} params
 * @param {string|number} [params.actorId]
 * @param {string} [params.actorName]
 * @param {string} params.action       - e.g. 'CREATE_IWO'
 * @param {string} params.entityType   - e.g. 'IWO'
 * @param {string|number} [params.entityId]
 * @param {object} [params.beforeData]
 * @param {object} [params.afterData]
 * @param {string} [params.ip]
 * @param {string} [params.source]     - 'WEB' | 'SYSTEM' | 'API'
 */
export const logAudit = async ({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  beforeData,
  afterData,
  ip,
  source = 'WEB',
}) => {
  try {
    await AuditLog.create({
      actor_id: actorId || null,
      actor_name: actorName || 'System',
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      before_data: beforeData ? JSON.stringify(beforeData) : null,
      after_data: afterData ? JSON.stringify(afterData) : null,
      ip_address: ip || null,
      source,
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
};
