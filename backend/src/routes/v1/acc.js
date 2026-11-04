import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error } from '../../utils/response.js';
import { logAudit } from '../../utils/auditLogger.js';
import {
  ACC, IWO, BAST, Customer, Service, User, AccEquipment, AccRequirement,
  SlaInfo, NetworkInfo, Device, DocumentTemplate, DocumentVersion
} from '../../models/index.js';
import { DocumentTemplateService } from '../../services/DocumentTemplateService.js';
import { DocumentRenderService } from '../../services/DocumentRenderService.js';
import nodemailer from 'nodemailer';

const router = Router();
router.use(authenticate);

const ACC_INCLUDES = [
  { model: IWO, as: 'iwo', include: [
    { model: Customer, as: 'customer' },
    { model: Service, as: 'service' },
    { model: User, as: 'sales', attributes: ['id', 'name', 'email'] },
    { model: NetworkInfo, as: 'networkInfo' },
    { model: Device, as: 'devices' },
  ]},
  { model: BAST, as: 'bast', attributes: ['id', 'bast_no', 'status', 'active_date'] },
  { model: AccEquipment, as: 'equipment' },
  { model: AccRequirement, as: 'requirements' },
  { model: SlaInfo, as: 'slaInfo', through: { attributes: [] } },
  { model: DocumentTemplate, as: 'template' },
  { model: DocumentVersion, as: 'templateVersion' },
];

// GET /api/v1/acc/:id
router.get('/:id', async (req, res, next) => {
  try {
    const acc = await ACC.findByPk(req.params.id, { include: ACC_INCLUDES });
    if (!acc) return error(res, 'ACC not found', 404);
    return success(res, acc);
  } catch (err) { next(err); }
});

// POST /api/v1/acc
router.post('/', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), async (req, res, next) => {
  try {
    const {
      iwo_id, bast_id, subscription_number, contract_number,
      customer_id_ext, service_id_ext, product_id_ext,
      activation_date, start_billing_date, monthly_tariff,
      contract_period, document_template_id,
    } = req.body;

    const iwo = await IWO.findByPk(iwo_id);
    if (!iwo) return error(res, 'IWO not found', 404);

    const existing = await ACC.findOne({ where: { iwo_id } });
    if (existing) return error(res, 'ACC already exists for this IWO', 409);

    // Resolve template
    let templateId = document_template_id;
    let templateVersionId = null;
    if (!templateId) {
      const defaultTemplate = await DocumentTemplateService.getDefaultTemplate('ACC');
      if (defaultTemplate) {
        templateId = defaultTemplate.id;
        const activeVersion = defaultTemplate.versions?.find(v => v.status === 'ACTIVE');
        if (activeVersion) templateVersionId = activeVersion.id;
      }
    }

    const acc = await ACC.create({
      iwo_id, bast_id, subscription_number, contract_number,
      customer_id_ext, service_id_ext, product_id_ext,
      activation_date, start_billing_date, monthly_tariff,
      contract_period, status: 'DRAFT',
      document_template_id: templateId,
      template_version_id: templateVersionId,
      created_by: req.user.id,
    });

    // Update IWO status
    await iwo.update({ status: 'ACC', updated_by: req.user.id });

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'ACC_CREATED', entityType: 'ACC', entityId: acc.id,
      afterData: { iwo_id, subscription_number }, ip: req.ip,
    });

    return success(res, await ACC.findByPk(acc.id, { include: ACC_INCLUDES }), 'ACC created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/acc/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const acc = await ACC.findByPk(req.params.id);
    if (!acc) return error(res, 'ACC not found', 404);

    const allowed = ['subscription_number', 'contract_number', 'customer_id_ext', 'service_id_ext',
      'product_id_ext', 'activation_date', 'start_billing_date', 'monthly_tariff', 'contract_period',
      'document_template_id'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_by = req.user.id;

    // Template change: update version
    if (updates.document_template_id && updates.document_template_id !== acc.document_template_id) {
      const tmpl = await DocumentTemplate.findByPk(updates.document_template_id, {
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }]
      });
      if (tmpl?.versions?.length > 0) updates.template_version_id = tmpl.versions[0].id;
    }

    await acc.update(updates);
    return success(res, await ACC.findByPk(acc.id, { include: ACC_INCLUDES }));
  } catch (err) { next(err); }
});

// POST /api/v1/acc/:id/equipment
router.post('/:id/equipment', authenticate, async (req, res, next) => {
  try {
    const eq = await AccEquipment.create({ acc_id: req.params.id, ...req.body });
    return success(res, eq, 'Equipment added', 201);
  } catch (err) { next(err); }
});

// DELETE /api/v1/acc/:id/equipment/:eqId
router.delete('/:id/equipment/:eqId', authenticate, async (req, res, next) => {
  try {
    const eq = await AccEquipment.findOne({ where: { id: req.params.eqId, acc_id: req.params.id } });
    if (!eq) return error(res, 'Equipment not found', 404);
    await eq.destroy();
    return success(res, null, 'Equipment removed');
  } catch (err) { next(err); }
});

// POST /api/v1/acc/:id/requirements
router.post('/:id/requirements', authenticate, async (req, res, next) => {
  try {
    const req_item = await AccRequirement.create({ acc_id: req.params.id, ...req.body });
    return success(res, req_item, 'Requirement added', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/acc/:id/requirements/:reqId
router.patch('/:id/requirements/:reqId', authenticate, async (req, res, next) => {
  try {
    const req_item = await AccRequirement.findOne({ where: { id: req.params.reqId, acc_id: req.params.id } });
    if (!req_item) return error(res, 'Requirement not found', 404);
    await req_item.update(req.body);
    return success(res, req_item);
  } catch (err) { next(err); }
});

// POST /api/v1/acc/:id/generate
router.post('/:id/generate', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT), async (req, res, next) => {
  try {
    const { template_version_id } = req.body;
    const acc = await ACC.findByPk(req.params.id);
    if (!acc) return error(res, 'ACC not found', 404);

    const versionId = template_version_id || acc.template_version_id;
    const result = await DocumentRenderService.generateACCDocument(acc.id, versionId, req.user.id);

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'ACC_DOCUMENT_GENERATED', entityType: 'ACC', entityId: acc.id,
      afterData: { template_version_id: versionId, path: result.path }, ip: req.ip,
    });

    return success(res, result, 'ACC document generated');
  } catch (err) { next(err); }
});

// POST /api/v1/acc/:id/send-email
router.post('/:id/send-email', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.SALES), async (req, res, next) => {
  try {
    const acc = await ACC.findByPk(req.params.id, { include: ACC_INCLUDES });
    if (!acc) return error(res, 'ACC not found', 404);

    // Generate token for customer approval
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();
    await acc.update({ customer_signature_token: token, status: 'SENT', email_sent_at: new Date() });

    // Email would be sent here with token
    // For now, log the action
    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'ACC_EMAIL_SENT', entityType: 'ACC', entityId: acc.id,
      afterData: { customer_email: acc.iwo?.customer?.email }, ip: req.ip,
    });

    return success(res, { token, status: 'SENT' }, 'ACC sent to customer');
  } catch (err) { next(err); }
});

// POST /api/v1/acc/approve/:token (public - customer approval)
router.post('/approve/:token', async (req, res, next) => {
  try {
    const acc = await ACC.findOne({
      where: { customer_signature_token: req.params.token, status: 'SENT' }
    });
    if (!acc) return error(res, 'Invalid or expired approval link', 404);

    await acc.update({
      status: 'CUSTOMER_APPROVED',
      customer_approved_at: new Date(),
    });

    // Close IWO
    const iwo = await IWO.findByPk(acc.iwo_id);
    if (iwo) {
      await iwo.update({ status: 'COMPLETED', progress: 100 });
    }

    await logAudit({
      action: 'ACC_CUSTOMER_APPROVED', entityType: 'ACC', entityId: acc.id,
      afterData: { token: req.params.token }, ip: req.ip,
    });

    return success(res, null, 'ACC approved successfully. IWO is now complete.');
  } catch (err) { next(err); }
});

// POST /api/v1/acc/:id/preview
router.post('/:id/preview', authenticate, async (req, res, next) => {
  try {
    const { template_version_id } = req.body;
    const result = await DocumentRenderService.previewACCDocument(req.params.id, template_version_id);
    return success(res, result, 'Preview generated');
  } catch (err) { next(err); }
});

export default router;
