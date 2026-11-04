import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { logAudit } from '../../utils/auditLogger.js';
import { DocumentTemplateService } from '../../services/DocumentTemplateService.js';
import { TemplatePlaceholderService } from '../../services/TemplatePlaceholderService.js';
import { DocumentRenderService } from '../../services/DocumentRenderService.js';
import { DocumentTemplate, DocumentVersion, User } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

const ADMIN_ONLY = authorize(ROLES.ADMINISTRATOR);

// ─── PLACEHOLDER CATALOG (MUST BE BEFORE /:id) ────────────────────────────────

// GET /api/v1/document-templates/placeholders/catalog
router.get('/placeholders/catalog', async (req, res, next) => {
  try {
    const catalog = TemplatePlaceholderService.getCatalog();
    const query = req.query.search?.toLowerCase();
    if (query) {
      const filtered = {};
      Object.entries(catalog).forEach(([groupKey, group]) => {
        const matchedFields = group.fields.filter((f) =>
          f.key.toLowerCase().includes(query) || f.label.toLowerCase().includes(query)
        );
        if (matchedFields.length > 0 || group.label.toLowerCase().includes(query)) {
          filtered[groupKey] = { ...group, fields: matchedFields.length > 0 ? matchedFields : group.fields };
        }
      });
      return success(res, filtered);
    }
    return success(res, catalog);
  } catch (err) { next(err); }
});

// ─── TEMPLATE LIST & CREATE ───────────────────────────────────────────────────

// GET /api/v1/document-templates
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.document_type) where.document_type = req.query.document_type;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';
    if (req.query.is_default !== undefined) where.is_default = req.query.is_default === 'true';
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { code: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await DocumentTemplate.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: DocumentVersion, as: 'versions', attributes: ['id', 'version', 'status', 'is_current', 'created_at'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates
router.post('/', ADMIN_ONLY, async (req, res, next) => {
  try {
    const { document_type, code, name, description, effective_from, effective_to, version: initVersion } = req.body;
    if (!document_type || !code || !name) {
      return error(res, 'document_type, code, and name are required', 400);
    }

    const existing = await DocumentTemplate.findOne({ where: { code } });
    if (existing) return error(res, 'Template code already exists', 409);

    const template = await DocumentTemplate.create({
      document_type,
      code,
      name,
      description,
      effective_from,
      effective_to,
      is_active: true,
      is_default: false,
      created_by: req.user.id,
    });

    const initialContent = DocumentTemplateService.getDefaultContent(document_type);
    await DocumentVersion.create({
      document_template_id: template.id,
      version: initVersion || '1.0',
      status: 'DRAFT',
      content: JSON.stringify(initialContent),
      is_current: true,
      created_by: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'TEMPLATE_CREATED',
      entityType: 'DocumentTemplate',
      entityId: template.id,
      afterData: { document_type, code, name },
      ip: req.ip,
    });

    const created = await DocumentTemplate.findByPk(template.id, {
      include: [{ model: DocumentVersion, as: 'versions' }],
    });
    return success(res, created, 'Template created', 201);
  } catch (err) { next(err); }
});

// GET /api/v1/document-templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findByPk(req.params.id, {
      include: [
        {
          model: DocumentVersion,
          as: 'versions',
          include: [
            { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
            { model: User, as: 'activatedByUser', attributes: ['id', 'name'] },
          ],
          order: [['created_at', 'DESC']],
        },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name'] },
      ],
    });
    if (!template) return error(res, 'Template not found', 404);
    return success(res, template);
  } catch (err) { next(err); }
});

// PATCH /api/v1/document-templates/:id
router.patch('/:id', ADMIN_ONLY, async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Template not found', 404);

    const { name, description, effective_from, effective_to } = req.body;
    const before = template.toJSON();
    await template.update({ name, description, effective_from, effective_to, updated_by: req.user.id });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'TEMPLATE_EDITED',
      entityType: 'DocumentTemplate',
      entityId: template.id,
      beforeData: before,
      afterData: { name, description },
      ip: req.ip,
    });

    return success(res, template);
  } catch (err) { next(err); }
});

// ─── TEMPLATE VERSIONS ───────────────────────────────────────────────────────

// GET /api/v1/document-templates/:id/versions
router.get('/:id/versions', async (req, res, next) => {
  try {
    const versions = await DocumentVersion.findAll({
      where: { document_template_id: req.params.id },
      include: [
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'activatedByUser', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return success(res, versions);
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions
router.post('/:id/versions', ADMIN_ONLY, async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Template not found', 404);

    const { version, content, base_version_id } = req.body;

    let versionContent;
    if (base_version_id) {
      const baseVersion = await DocumentVersion.findOne({
        where: { id: base_version_id, document_template_id: req.params.id },
      });
      if (!baseVersion) return error(res, 'Base version not found', 404);
      versionContent = content || baseVersion.content;
    } else {
      versionContent = content || JSON.stringify(DocumentTemplateService.getDefaultContent(template.document_type));
    }

    const existing = await DocumentVersion.findOne({
      where: { document_template_id: req.params.id, version },
    });
    if (existing) return error(res, `Version '${version}' already exists`, 409);

    await DocumentVersion.update(
      { is_current: false },
      { where: { document_template_id: req.params.id } }
    );

    const newVersion = await DocumentVersion.create({
      document_template_id: req.params.id,
      version,
      status: 'DRAFT',
      content: typeof versionContent === 'string' ? versionContent : JSON.stringify(versionContent),
      is_current: true,
      created_by: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'VERSION_CREATED',
      entityType: 'DocumentVersion',
      entityId: newVersion.id,
      afterData: { template_id: req.params.id, version, base_version_id },
      ip: req.ip,
    });

    return success(res, newVersion, 'Version created', 201);
  } catch (err) { next(err); }
});

// GET /api/v1/document-templates/:id/versions/:versionId
router.get('/:id/versions/:versionId', async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
      include: [{ model: DocumentTemplate, as: 'template' }],
    });
    if (!version) return error(res, 'Version not found', 404);

    let parsedContent;
    try {
      parsedContent = JSON.parse(version.content || '{}');
    } catch {
      parsedContent = version.content;
    }

    return success(res, { ...version.toJSON(), parsedContent });
  } catch (err) { next(err); }
});

// PATCH /api/v1/document-templates/:id/versions/:versionId
router.patch('/:id/versions/:versionId', ADMIN_ONLY, async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
    });
    if (!version) return error(res, 'Version not found', 404);
    if (version.status !== 'DRAFT') {
      return error(res, 'Only DRAFT versions can be edited. Create a new version to modify an ACTIVE template.', 400);
    }

    const { content } = req.body;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    await version.update({ content: contentStr });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'VERSION_CONTENT_UPDATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      afterData: { template_id: req.params.id, version: version.version },
      ip: req.ip,
    });

    return success(res, version, 'Draft updated successfully');
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions/:versionId/validate
router.post('/:id/versions/:versionId/validate', ADMIN_ONLY, async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
    });
    if (!version) return error(res, 'Version not found', 404);

    const result = TemplatePlaceholderService.validateTemplate(version.content);
    return success(res, result, result.isValid ? 'Template is valid' : 'Template contains invalid placeholders');
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions/:versionId/preview
router.post('/:id/versions/:versionId/preview', async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
      include: [{ model: DocumentTemplate, as: 'template' }],
    });
    if (!version) return error(res, 'Version not found', 404);

    const { entity_id, use_sample } = req.body;
    const docType = version.template.document_type;

    let renderData;
    if (use_sample || !entity_id) {
      renderData = DocumentRenderService.getSampleData(docType);
    } else {
      renderData = await DocumentRenderService.buildRenderData(docType, entity_id);
    }

    const html = DocumentRenderService.renderTemplateHtml(version.content, renderData);

    return success(res, {
      html,
      is_sample: !!renderData._isSample,
      template: { id: version.template.id, name: version.template.name, type: docType },
      version: version.version,
    }, 'Preview generated');
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions/:versionId/activate
router.post('/:id/versions/:versionId/activate', ADMIN_ONLY, async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
    });
    if (!version) return error(res, 'Version not found', 404);
    if (version.status === 'ARCHIVED') return error(res, 'Archived versions cannot be activated', 400);

    const before = { status: version.status };

    // Deactivate previous active version
    await DocumentVersion.update(
      { status: 'INACTIVE' },
      { where: { document_template_id: req.params.id, status: 'ACTIVE' } }
    );

    await version.update({
      status: 'ACTIVE',
      activated_at: new Date(),
      activated_by: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'VERSION_ACTIVATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      beforeData: before,
      afterData: { status: 'ACTIVE' },
      ip: req.ip,
    });

    return success(res, version, 'Version activated');
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions/:versionId/deactivate
router.post('/:id/versions/:versionId/deactivate', ADMIN_ONLY, async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
    });
    if (!version) return error(res, 'Version not found', 404);

    await version.update({ status: 'INACTIVE' });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'VERSION_DEACTIVATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      afterData: { status: 'INACTIVE' },
      ip: req.ip,
    });

    return success(res, version, 'Version deactivated');
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/versions/:versionId/archive
router.post('/:id/versions/:versionId/archive', ADMIN_ONLY, async (req, res, next) => {
  try {
    const version = await DocumentVersion.findOne({
      where: { id: req.params.versionId, document_template_id: req.params.id },
    });
    if (!version) return error(res, 'Version not found', 404);
    if (version.status === 'ACTIVE') return error(res, 'Deactivate version before archiving', 400);

    await version.update({ status: 'ARCHIVED' });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'VERSION_ARCHIVED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      afterData: { status: 'ARCHIVED' },
      ip: req.ip,
    });

    return success(res, null, 'Version archived');
  } catch (err) { next(err); }
});

// ─── TEMPLATE LEVEL ACTIONS ───────────────────────────────────────────────────

// POST /api/v1/document-templates/:id/set-default
router.post('/:id/set-default', ADMIN_ONLY, async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Template not found', 404);
    if (!template.is_active) return error(res, 'Template must be active to set as default', 400);

    await DocumentTemplate.update(
      { is_default: false },
      { where: { document_type: template.document_type, is_default: true } }
    );

    await template.update({ is_default: true, updated_by: req.user.id });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'TEMPLATE_SET_DEFAULT',
      entityType: 'DocumentTemplate',
      entityId: template.id,
      afterData: { document_type: template.document_type, is_default: true },
      ip: req.ip,
    });

    return success(res, template, `Template set as default ${template.document_type}`);
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/duplicate
router.post('/:id/duplicate', ADMIN_ONLY, async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return error(res, 'Name and code are required for duplicate', 400);

    const duplicated = await DocumentTemplateService.duplicate(req.params.id, { name, code }, req.user.id);
    return success(res, duplicated, 'Template duplicated', 201);
  } catch (err) { next(err); }
});

// POST /api/v1/document-templates/:id/archive
router.post('/:id/archive', ADMIN_ONLY, async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findByPk(req.params.id);
    if (!template) return error(res, 'Template not found', 404);
    if (template.is_default) return error(res, 'Cannot archive the default template', 400);

    await DocumentTemplateService.archive(req.params.id, req.user.id);
    return success(res, null, 'Template archived');
  } catch (err) { next(err); }
});

export default router;
