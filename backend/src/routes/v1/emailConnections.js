import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { logAudit } from '../../utils/auditLogger.js';
import { EmailConnection, EmailMessage, EmailRule, User } from '../../models/index.js';
import { Op } from 'sequelize';
import { syncEmailConnection, testEmailConnection } from '../../services/emailSyncService.js';

const router = Router();
router.use(authenticate);

const ADMIN_MGMT = authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT);

// GET /api/v1/email-connections
router.get('/', ADMIN_MGMT, async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.provider) where.provider = req.query.provider;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email_address: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await EmailConnection.findAndCountAll({
      where,
      limit,
      offset,
      attributes: { exclude: ['password', 'oauth_token'] },
      include: [
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// GET /api/v1/email-connections/:id
router.get('/:id', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'oauth_token'] },
      include: [
        { model: EmailRule, as: 'rules' },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name'] },
      ],
    });
    if (!connection) return error(res, 'Email connection not found', 404);
    return success(res, connection);
  } catch (err) { next(err); }
});

router.get('/:id/rules', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id);
    if (!connection) return error(res, 'Email connection not found', 404);
    const rules = await EmailRule.findAll({
      where: { email_connection_id: connection.id },
      order: [['created_at', 'ASC']],
    });
    return success(res, rules);
  } catch (err) { next(err); }
});

router.post('/:id/rules', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id);
    if (!connection) return error(res, 'Email connection not found', 404);

    const { name, condition_field, condition_operator, condition_value, action, is_active } = req.body;
    if (typeof name !== 'string' || !name.trim()
      || typeof condition_value !== 'string' || !condition_value.trim()
      || !['FROM', 'SUBJECT', 'TO', 'BODY'].includes(condition_field)
      || !['CONTAINS', 'EQUALS', 'STARTS_WITH'].includes(condition_operator)
      || !['LINK_IWO', 'MARK_READ', 'SKIP'].includes(action)
      || (is_active !== undefined && typeof is_active !== 'boolean')) {
      return error(res, 'Invalid email filter rule', 400);
    }

    const rule = await EmailRule.create({
      email_connection_id: connection.id,
      name: name.trim(),
      condition_field,
      condition_operator,
      condition_value: condition_value.trim(),
      action,
      is_active: is_active !== false,
      created_by: req.user.id,
    });
    return success(res, rule, 'Email filter rule created', 201);
  } catch (err) { next(err); }
});

router.patch('/:id/rules/:ruleId', ADMIN_MGMT, async (req, res, next) => {
  try {
    const rule = await EmailRule.findOne({
      where: { id: req.params.ruleId, email_connection_id: req.params.id },
    });
    if (!rule) return error(res, 'Email filter rule not found', 404);

    const allowed = ['name', 'condition_field', 'condition_operator', 'condition_value', 'action', 'is_active'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if ((updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim()))
      || (updates.condition_value !== undefined && (typeof updates.condition_value !== 'string' || !updates.condition_value.trim()))
      || (updates.condition_field !== undefined && !['FROM', 'SUBJECT', 'TO', 'BODY'].includes(updates.condition_field))
      || (updates.condition_operator !== undefined && !['CONTAINS', 'EQUALS', 'STARTS_WITH'].includes(updates.condition_operator))
      || (updates.action !== undefined && !['LINK_IWO', 'MARK_READ', 'SKIP'].includes(updates.action))
      || (updates.is_active !== undefined && typeof updates.is_active !== 'boolean')) {
      return error(res, 'Invalid email filter rule', 400);
    }
    await rule.update(updates);
    return success(res, rule, 'Email filter rule updated');
  } catch (err) { next(err); }
});

router.delete('/:id/rules/:ruleId', ADMIN_MGMT, async (req, res, next) => {
  try {
    const rule = await EmailRule.findOne({
      where: { id: req.params.ruleId, email_connection_id: req.params.id },
    });
    if (!rule) return error(res, 'Email filter rule not found', 404);
    await rule.destroy();
    return success(res, null, 'Email filter rule deleted');
  } catch (err) { next(err); }
});

// POST /api/v1/email-connections
router.post('/', ADMIN_MGMT, async (req, res, next) => {
  try {
    const {
      name, provider, email_address, auth_type, password, oauth_token,
      imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure,
      folder, sync_interval, status,
    } = req.body;

    const connection = await EmailConnection.create({
      name,
      provider: provider || 'CUSTOM',
      email_address,
      auth_type: auth_type || 'PASSWORD',
      password,
      oauth_token,
      imap_host,
      imap_port: imap_port || 993,
      imap_secure: imap_secure !== false,
      smtp_host,
      smtp_port: smtp_port || 465,
      smtp_secure: smtp_secure !== false,
      folder: folder || 'INBOX',
      sync_interval: sync_interval || 5,
      status: status || 'ACTIVE',
      created_by: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'EMAIL_CONNECTION_CREATED',
      entityType: 'EmailConnection',
      entityId: connection.id,
      afterData: { name, provider, email_address },
      ip: req.ip,
    });

    const result = connection.toJSON();
    delete result.password;
    delete result.oauth_token;
    return success(res, result, 'Email connection created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/email-connections/:id (Supports editing email address, preserving history)
router.patch('/:id', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id);
    if (!connection) return error(res, 'Email connection not found', 404);

    const allowed = [
      'name', 'provider', 'email_address', 'auth_type', 'password', 'oauth_token',
      'imap_host', 'imap_port', 'imap_secure', 'smtp_host', 'smtp_port', 'smtp_secure',
      'folder', 'sync_interval', 'status',
    ];

    const before = {
      name: connection.name,
      provider: connection.provider,
      email_address: connection.email_address,
      folder: connection.folder,
      sync_interval: connection.sync_interval,
      status: connection.status,
    };

    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    updates.updated_by = req.user.id;

    await connection.update(updates);

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'EMAIL_CONNECTION_UPDATED',
      entityType: 'EmailConnection',
      entityId: connection.id,
      beforeData: before,
      afterData: {
        name: connection.name,
        email_address: connection.email_address,
        provider: connection.provider,
        status: connection.status,
      },
      ip: req.ip,
    });

    const result = connection.toJSON();
    delete result.password;
    delete result.oauth_token;
    return success(res, result, 'Email connection updated successfully');
  } catch (err) { next(err); }
});

// POST /api/v1/email-connections/:id/test
router.post('/:id/test', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id);
    if (!connection) return error(res, 'Email connection not found', 404);

    const result = await testEmailConnection(connection);

    return success(res, {
      connected: result.connected,
      provider: connection.provider,
      email_address: connection.email_address,
      mailbox: result.mailbox,
      tested_at: new Date(),
      message: `Successfully connected to ${connection.email_address} via ${connection.provider}`,
    }, 'Connection test successful');
  } catch (err) { next(err); }
});

// POST /api/v1/email-connections/:id/sync (Trigger manual sync now)
router.post('/:id/sync', ADMIN_MGMT, async (req, res, next) => {
  try {
    const connection = await EmailConnection.findByPk(req.params.id);
    if (!connection) return error(res, 'Email connection not found', 404);

    const syncResult = await syncEmailConnection(connection);

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'EMAIL_SYNC_TRIGGERED',
      entityType: 'EmailConnection',
      entityId: connection.id,
      ip: req.ip,
    });

    return success(res, {
      synced_at: syncResult.synced_at,
      status: 'SUCCESS',
      new_messages_count: syncResult.new_messages_count,
      ignored_messages_count: syncResult.ignored_messages_count,
      processed_messages_count: syncResult.processed_messages_count,
      has_more: syncResult.has_more,
    }, 'Email sync completed successfully');
  } catch (err) { next(err); }
});

// GET /api/v1/email-connections/:id/messages (Email Inbox)
router.get('/:id/messages', ADMIN_MGMT, async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = { email_connection_id: req.params.id };
    if (req.query.is_read !== undefined) where.is_read = req.query.is_read === 'true';

    const { count, rows } = await EmailMessage.findAndCountAll({
      where,
      limit,
      offset,
      order: [['received_at', 'DESC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

export default router;
