import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { AuditLog, User } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/v1/audit-logs
router.get('/', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;
    if (req.query.action) where.action = req.query.action;
    if (req.query.actor_id) where.actor_id = req.query.actor_id;
    if (req.query.search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${req.query.search}%` } },
        { entity_type: { [Op.like]: `%${req.query.search}%` } },
        { actor_name: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

export default router;
