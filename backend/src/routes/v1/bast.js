import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error } from '../../utils/response.js';
import { logAudit } from '../../utils/auditLogger.js';
import {
  BAST, IWO, BastApproval, Customer, Service, User,
  NetworkInfo, Device, SlaInfo, DocumentTemplate, DocumentVersion
} from '../../models/index.js';
import { DocumentTemplateService } from '../../services/DocumentTemplateService.js';
import { DocumentRenderService } from '../../services/DocumentRenderService.js';

const router = Router();
router.use(authenticate);

const BAST_INCLUDES = [
  { model: IWO, as: 'iwo', include: [
    { model: Customer, as: 'customer' },
    { model: Service, as: 'service' },
    { model: User, as: 'sales', attributes: ['id', 'name', 'email', 'phone'] },
    { model: User, as: 'engineer', attributes: ['id', 'name', 'email', 'phone'] },
    { model: NetworkInfo, as: 'networkInfo' },
    { model: SlaInfo, as: 'slaInfo' },
    { model: Device, as: 'devices' },
  ]},
  { model: BastApproval, as: 'approvals', separate: true, order: [['order', 'ASC']] },
  { model: DocumentTemplate, as: 'template' },
  { model: DocumentVersion, as: 'templateVersion' },
];

// GET /api/v1/bast/:id
router.get('/:id', async (req, res, next) => {
  try {
    const bast = await BAST.findByPk(req.params.id, { include: BAST_INCLUDES });
    if (!bast) return error(res, 'BAST not found', 404);
    return success(res, bast);
  } catch (err) { next(err); }
});

// POST /api/v1/bast - Create BAST for IWO
router.post('/', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT, ROLES.ENGINEER), async (req, res, next) => {
  try {
    const { iwo_id, active_date, notes, document_template_id } = req.body;

    const iwo = await IWO.findByPk(iwo_id);
    if (!iwo) return error(res, 'IWO not found', 404);

    const existing = await BAST.findOne({ where: { iwo_id } });
    if (existing) return error(res, 'BAST already exists for this IWO', 409);

    // Resolve template
    let templateId = document_template_id;
    let templateVersionId = null;
    if (!templateId) {
      const defaultTemplate = await DocumentTemplateService.getDefaultTemplate('BAST');
      if (defaultTemplate) {
        templateId = defaultTemplate.id;
        const activeVersion = defaultTemplate.versions?.find(v => v.status === 'ACTIVE');
        if (activeVersion) templateVersionId = activeVersion.id;
      }
    }

    // Generate BAST number
    const bastCount = await BAST.count();
    const bast_no = `BAST-${String(bastCount + 1).padStart(6, '0')}/${iwo.iwo_no.split('/')[3]}/${iwo.iwo_no.split('/')[4]}`;

    const bast = await BAST.create({
      iwo_id,
      bast_no,
      active_date,
      status: 'DRAFT',
      notes,
      document_template_id: templateId,
      template_version_id: templateVersionId,
      created_by: req.user.id,
    });

    // Create default approvals
    const approvalRoles = ['ENGINEER', 'SALES', 'FULFILMENT', 'MANAGER_MON', 'MANAGER_INDUSTRY', 'HEAD_OSS'];
    for (let i = 0; i < approvalRoles.length; i++) {
      await BastApproval.create({
        bast_id: bast.id,
        role: approvalRoles[i],
        status: 'PENDING',
        order: i + 1,
      });
    }

    // Update IWO status to BAST
    await iwo.update({ status: 'BAST', updated_by: req.user.id });

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'BAST_CREATED', entityType: 'BAST', entityId: bast.id,
      afterData: { bast_no, iwo_id }, ip: req.ip,
    });

    const created = await BAST.findByPk(bast.id, { include: BAST_INCLUDES });
    return success(res, created, 'BAST created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/bast/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const bast = await BAST.findByPk(req.params.id);
    if (!bast) return error(res, 'BAST not found', 404);

    const allowed = ['active_date', 'notes', 'outdoor_photo_url', 'indoor_photo_url',
      'topology_url', 'speedtest_iix_url', 'speedtest_ix_url', 'speedtest_wifi_url',
      'winbox_url', 'mrtg_url', 'document_template_id'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updated_by = req.user.id;

    // If template changed, find active version
    if (updates.document_template_id && updates.document_template_id !== bast.document_template_id) {
      const tmpl = await DocumentTemplate.findByPk(updates.document_template_id, {
        include: [{ model: DocumentVersion, as: 'versions', where: { status: 'ACTIVE' }, required: false }]
      });
      if (tmpl && tmpl.versions?.length > 0) {
        updates.template_version_id = tmpl.versions[0].id;
      }
    }

    await bast.update(updates);
    return success(res, await BAST.findByPk(bast.id, { include: BAST_INCLUDES }));
  } catch (err) { next(err); }
});

// PATCH /api/v1/bast/:id/approval/:approvalId
router.patch('/:id/approval/:approvalId', authenticate, async (req, res, next) => {
  try {
    const approval = await BastApproval.findOne({
      where: { id: req.params.approvalId, bast_id: req.params.id },
    });
    if (!approval) return error(res, 'Approval not found', 404);

    const { status, notes } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return error(res, 'Invalid status', 400);

    await approval.update({
      status,
      notes,
      user_id: req.user.id,
      approved_at: new Date(),
    });

    // Check if all approvals done
    const bast = await BAST.findByPk(req.params.id, {
      include: [{ model: BastApproval, as: 'approvals' }]
    });
    const allApproved = bast.approvals.every(a => a.status === 'APPROVED');
    const anyRejected = bast.approvals.some(a => a.status === 'REJECTED');

    if (anyRejected) {
      await bast.update({ status: 'REJECTED' });
    } else if (allApproved) {
      await bast.update({ status: 'APPROVED' });
    } else {
      await bast.update({ status: 'PENDING_APPROVAL' });
    }

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'BAST_APPROVAL_UPDATED', entityType: 'BAST', entityId: bast.id,
      afterData: { approval_id: approval.id, status }, ip: req.ip,
    });

    return success(res, approval);
  } catch (err) { next(err); }
});

// POST /api/v1/bast/:id/submit-approval
router.post('/:id/submit-approval', authenticate, async (req, res, next) => {
  try {
    const bast = await BAST.findByPk(req.params.id);
    if (!bast) return error(res, 'BAST not found', 404);
    if (bast.status !== 'DRAFT') return error(res, 'BAST is not in DRAFT status', 400);
    await bast.update({ status: 'PENDING_APPROVAL', updated_by: req.user.id });
    return success(res, { status: 'PENDING_APPROVAL' }, 'BAST submitted for approval');
  } catch (err) { next(err); }
});

// POST /api/v1/bast/:id/generate
router.post('/:id/generate', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT), async (req, res, next) => {
  try {
    const bast = await BAST.findByPk(req.params.id, { include: BAST_INCLUDES });
    if (!bast) return error(res, 'BAST not found', 404);
    if (!['APPROVED', 'DRAFT'].includes(bast.status)) {
      return error(res, 'BAST must be APPROVED or DRAFT to generate document', 400);
    }

    const { template_version_id } = req.body;
    const versionId = template_version_id || bast.template_version_id;

    const result = await DocumentRenderService.generateBASTDocument(bast.id, versionId, req.user.id);

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'BAST_DOCUMENT_GENERATED', entityType: 'BAST', entityId: bast.id,
      afterData: { template_version_id: versionId, path: result.path }, ip: req.ip,
    });

    return success(res, result, 'BAST document generated');
  } catch (err) { next(err); }
});

// POST /api/v1/bast/:id/preview
router.post('/:id/preview', authenticate, async (req, res, next) => {
  try {
    const { template_version_id } = req.body;
    const result = await DocumentRenderService.previewBASTDocument(req.params.id, template_version_id);
    return success(res, result, 'Preview generated');
  } catch (err) { next(err); }
});

export default router;
