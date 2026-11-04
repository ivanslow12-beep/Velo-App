import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { Attachment, User } from '../../models/index.js';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// GET /api/v1/attachments
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;
    if (req.query.document_type) where.document_type = req.query.document_type;

    const { count, rows } = await Attachment.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: User, as: 'createdByUser', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// GET /api/v1/attachments/:id/download (Private file authorization)
router.get('/:id/download', async (req, res, next) => {
  try {
    const attachment = await Attachment.findByPk(req.params.id);
    if (!attachment) return error(res, 'File not found', 404);

    // Build absolute path
    let filePath;
    if (attachment.storage_key.startsWith('documents/')) {
      filePath = path.resolve(process.cwd(), 'storage/private', attachment.storage_key.replace(/_[a-f0-9-]+$/, ''));
    } else {
      filePath = path.resolve(process.cwd(), 'storage/private', attachment.filename);
    }

    if (!fs.existsSync(filePath)) {
      // Check documents subdirectories
      const altPaths = [
        path.resolve(process.cwd(), 'storage/private/documents/bast', attachment.filename),
        path.resolve(process.cwd(), 'storage/private/documents/acc', attachment.filename),
        path.resolve(process.cwd(), 'storage/private', attachment.filename),
      ];
      filePath = altPaths.find((p) => fs.existsSync(p));
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return error(res, 'Physical file not found on server', 404);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (err) { next(err); }
});

// GET /api/v1/attachments/:id/view (Inline preview with auth)
router.get('/:id/view', async (req, res, next) => {
  try {
    const attachment = await Attachment.findByPk(req.params.id);
    if (!attachment) return error(res, 'File not found', 404);

    const altPaths = [
      path.resolve(process.cwd(), 'storage/private/documents/bast', attachment.filename),
      path.resolve(process.cwd(), 'storage/private/documents/acc', attachment.filename),
      path.resolve(process.cwd(), 'storage/private', attachment.filename),
    ];
    const filePath = altPaths.find((p) => fs.existsSync(p));

    if (!filePath) {
      return error(res, 'Physical file not found on server', 404);
    }

    res.setHeader('Content-Type', attachment.mime_type || 'text/html');
    return res.sendFile(filePath);
  } catch (err) { next(err); }
});

export default router;
