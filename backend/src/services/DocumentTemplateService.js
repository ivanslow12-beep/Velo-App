import { Op } from 'sequelize';
import { DocumentTemplate, DocumentVersion, User } from '../models/index.js';
import { getPagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { logAudit } from '../utils/auditLogger.js';
import { BAST_CONTENT, ACC_CONTENT } from '../config/defaultTemplates.js';

export class DocumentTemplateService {
  /**
   * Return default schema/content JSON for a new template by type.
   */
  static getDefaultContent(documentType) {
    if (documentType === 'ACC') {
      return JSON.parse(JSON.stringify(ACC_CONTENT));
    }
    return JSON.parse(JSON.stringify(BAST_CONTENT));
  }

  /**
   * List templates with optional filters and pagination.
   */
  static async list(filters = {}, paginationQuery = {}) {
    const { page, limit, offset } = getPagination(paginationQuery);
    const where = {};

    if (filters.document_type) where.document_type = filters.document_type;
    if (typeof filters.is_active !== 'undefined') where.is_active = filters.is_active;
    if (typeof filters.is_default !== 'undefined') where.is_default = filters.is_default;
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { code: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await DocumentTemplate.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: DocumentVersion,
          as: 'versions',
          attributes: ['id', 'version', 'status', 'is_current', 'created_at', 'activated_at'],
        },
        { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    return {
      rows,
      pagination: buildPaginationMeta(count, page, limit),
    };
  }

  /**
   * Get a template by ID, including all its versions.
   */
  static async getById(id) {
    const template = await DocumentTemplate.findByPk(id, {
      include: [
        {
          model: DocumentVersion,
          as: 'versions',
          include: [
            { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'activatedByUser', attributes: ['id', 'name', 'email'] },
          ],
          order: [['created_at', 'DESC']],
        },
        { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!template) throw { status: 404, message: 'Document template not found' };
    return template;
  }

  /**
   * Create a new template and seed an initial DRAFT version.
   */
  static async create(data, actorId) {
    const existing = await DocumentTemplate.findOne({ where: { code: data.code } });
    if (existing) throw { status: 409, message: `Template code '${data.code}' already exists` };

    const template = await DocumentTemplate.create({
      name: data.name,
      code: data.code,
      document_type: data.document_type,
      description: data.description || null,
      is_active: data.is_active !== false,
      is_default: data.is_default || false,
      effective_from: data.effective_from || null,
      effective_to: data.effective_to || null,
      created_by: actorId,
    });

    const initialContent = data.initial_content || DocumentTemplateService.getDefaultContent(data.document_type);

    await DocumentVersion.create({
      document_template_id: template.id,
      version: data.version || '1.0',
      status: 'DRAFT',
      content: typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent),
      is_current: true,
      created_by: actorId,
    });

    await logAudit({
      actorId,
      action: 'TEMPLATE_CREATED',
      entityType: 'DocumentTemplate',
      entityId: template.id,
      afterData: template.toJSON(),
    });

    return DocumentTemplateService.getById(template.id);
  }

  /**
   * Update template metadata (not version content).
   */
  static async update(id, data, actorId) {
    const template = await DocumentTemplate.findByPk(id);
    if (!template) throw { status: 404, message: 'Document template not found' };

    const before = template.toJSON();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.description !== undefined) updateFields.description = data.description;
    if (typeof data.is_active !== 'undefined') updateFields.is_active = data.is_active;
    if (data.effective_from !== undefined) updateFields.effective_from = data.effective_from;
    if (data.effective_to !== undefined) updateFields.effective_to = data.effective_to;
    updateFields.updated_by = actorId;

    await template.update(updateFields);

    await logAudit({
      actorId,
      action: 'TEMPLATE_EDITED',
      entityType: 'DocumentTemplate',
      entityId: id,
      beforeData: before,
      afterData: template.toJSON(),
    });

    return template;
  }

  /**
   * Create a new DRAFT version for a template.
   */
  static async createVersion(templateId, data, actorId) {
    const template = await DocumentTemplate.findByPk(templateId);
    if (!template) throw { status: 404, message: 'Document template not found' };

    let nextVersion = data.version;
    if (!nextVersion) {
      const versions = await DocumentVersion.findAll({
        where: { document_template_id: templateId },
      });
      nextVersion = `1.${versions.length}`;
    }

    const existing = await DocumentVersion.findOne({
      where: { document_template_id: templateId, version: nextVersion },
    });
    if (existing) throw { status: 409, message: `Version ${nextVersion} already exists` };

    let content = data.content;
    if (!content && data.base_version_id) {
      const base = await DocumentVersion.findOne({
        where: { id: data.base_version_id, document_template_id: templateId },
      });
      if (base) content = base.content;
    }
    if (!content) {
      content = JSON.stringify(DocumentTemplateService.getDefaultContent(template.document_type));
    }

    await DocumentVersion.update(
      { is_current: false },
      { where: { document_template_id: templateId } }
    );

    const version = await DocumentVersion.create({
      document_template_id: templateId,
      version: nextVersion,
      status: 'DRAFT',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      is_current: true,
      created_by: actorId,
    });

    await logAudit({
      actorId,
      action: 'VERSION_CREATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      afterData: version.toJSON(),
    });

    return version;
  }

  /**
   * Get a specific version of a template.
   */
  static async getVersion(templateId, versionId) {
    const version = await DocumentVersion.findOne({
      where: { id: versionId, document_template_id: templateId },
      include: [
        { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'activatedByUser', attributes: ['id', 'name', 'email'] },
      ],
    });
    if (!version) throw { status: 404, message: 'Template version not found' };
    return version;
  }

  /**
   * Update content of a DRAFT version.
   */
  static async updateVersionContent(templateId, versionId, content, actorId) {
    const version = await DocumentTemplateService.getVersion(templateId, versionId);
    if (version.status !== 'DRAFT') {
      throw { status: 400, message: 'Only DRAFT versions can be edited. Create a new version to modify an ACTIVE template.' };
    }

    const before = version.toJSON();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    await version.update({ content: contentStr });

    await logAudit({
      actorId,
      action: 'VERSION_CONTENT_UPDATED',
      entityType: 'DocumentVersion',
      entityId: versionId,
      beforeData: before,
      afterData: version.toJSON(),
    });

    return version;
  }

  /**
   * Activate a version, deactivating other active versions of the same template.
   */
  static async activateVersion(templateId, versionId, actorId) {
    const version = await DocumentTemplateService.getVersion(templateId, versionId);
    if (version.status === 'ARCHIVED') {
      throw { status: 400, message: 'Archived versions cannot be activated' };
    }

    await DocumentVersion.update(
      { status: 'INACTIVE' },
      { where: { document_template_id: templateId, status: 'ACTIVE' } }
    );

    await version.update({
      status: 'ACTIVE',
      activated_at: new Date(),
      activated_by: actorId,
    });

    await logAudit({
      actorId,
      action: 'VERSION_ACTIVATED',
      entityType: 'DocumentVersion',
      entityId: versionId,
    });

    return version;
  }

  /**
   * Deactivate a specific version.
   */
  static async deactivateVersion(templateId, versionId, actorId) {
    const version = await DocumentTemplateService.getVersion(templateId, versionId);
    await version.update({ status: 'INACTIVE' });

    await logAudit({
      actorId,
      action: 'VERSION_DEACTIVATED',
      entityType: 'DocumentVersion',
      entityId: versionId,
    });

    return version;
  }

  /**
   * Archive a specific version.
   */
  static async archiveVersion(templateId, versionId, actorId) {
    const version = await DocumentTemplateService.getVersion(templateId, versionId);
    if (version.status === 'ACTIVE') {
      throw { status: 400, message: 'Deactivate version before archiving' };
    }
    await version.update({ status: 'ARCHIVED' });

    await logAudit({
      actorId,
      action: 'VERSION_ARCHIVED',
      entityType: 'DocumentVersion',
      entityId: versionId,
    });

    return version;
  }

  /**
   * Set a template as default for its document_type.
   */
  static async setDefault(templateId, actorId) {
    const template = await DocumentTemplate.findByPk(templateId);
    if (!template) throw { status: 404, message: 'Document template not found' };
    if (!template.is_active) throw { status: 400, message: 'Template must be active to set as default' };

    await DocumentTemplate.update(
      { is_default: false },
      { where: { document_type: template.document_type, id: { [Op.ne]: templateId } } }
    );

    await template.update({ is_default: true, updated_by: actorId });

    await logAudit({
      actorId,
      action: 'TEMPLATE_SET_DEFAULT',
      entityType: 'DocumentTemplate',
      entityId: templateId,
      afterData: { document_type: template.document_type, is_default: true },
    });

    return template;
  }

  /**
   * Duplicate an existing template.
   */
  static async duplicate(templateId, data, actorId) {
    const source = await DocumentTemplateService.getById(templateId);

    const existing = await DocumentTemplate.findOne({ where: { code: data.code } });
    if (existing) throw { status: 409, message: `Template code '${data.code}' already exists` };

    const newTemplate = await DocumentTemplate.create({
      name: data.name,
      code: data.code,
      document_type: source.document_type,
      description: data.description || (source.description ? `Copy of: ${source.description}` : null),
      is_active: true,
      is_default: false,
      created_by: actorId,
    });

    const activeVersion = source.versions?.find((v) => v.status === 'ACTIVE') || source.versions?.[0];
    const sourceContent = activeVersion?.content || JSON.stringify(DocumentTemplateService.getDefaultContent(source.document_type));

    await DocumentVersion.create({
      document_template_id: newTemplate.id,
      version: '1.0',
      status: 'DRAFT',
      content: typeof sourceContent === 'string' ? sourceContent : JSON.stringify(sourceContent),
      is_current: true,
      created_by: actorId,
    });

    await logAudit({
      actorId,
      action: 'TEMPLATE_DUPLICATED',
      entityType: 'DocumentTemplate',
      entityId: newTemplate.id,
      afterData: { original_id: templateId, new_code: data.code, new_name: data.name },
    });

    return DocumentTemplateService.getById(newTemplate.id);
  }

  /**
   * Archive a template.
   */
  static async archive(templateId, actorId) {
    const template = await DocumentTemplate.findByPk(templateId);
    if (!template) throw { status: 404, message: 'Document template not found' };
    if (template.is_default) throw { status: 400, message: 'Cannot archive default template' };

    await template.update({ is_active: false, is_default: false, updated_by: actorId });

    await DocumentVersion.update(
      { status: 'ARCHIVED' },
      { where: { document_template_id: templateId, status: { [Op.in]: ['DRAFT', 'INACTIVE'] } } }
    );

    await logAudit({
      actorId,
      action: 'TEMPLATE_ARCHIVED',
      entityType: 'DocumentTemplate',
      entityId: templateId,
    });

    return template;
  }

  /**
   * Get default active template for document_type.
   */
  static async getDefaultTemplate(documentType) {
    const template = await DocumentTemplate.findOne({
      where: { document_type: documentType, is_default: true, is_active: true },
      include: [
        {
          model: DocumentVersion,
          as: 'versions',
          where: { status: 'ACTIVE' },
          required: false,
        },
      ],
    });
    return template;
  }
}
