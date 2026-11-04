import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { Notification } from '../../models/index.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = { user_id: req.user.id };
    if (req.query.is_read !== undefined) where.is_read = req.query.is_read === 'true';

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    return paginated(res, { notifications: rows, unread_count: unreadCount }, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) return error(res, 'Notification not found', 404);
    await notification.update({ is_read: true, read_at: new Date() });
    return success(res, notification);
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/read-all
router.post('/read-all', async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return success(res, null, 'All marked as read');
  } catch (err) { next(err); }
});

export default router;
