import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize, ROLES } from '../../middleware/rbac.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { logAudit } from '../../utils/auditLogger.js';
import { User } from '../../models/index.js';
import { AuthService } from '../../services/AuthService.js';
import { UserService } from '../../services/UserService.js';
import { Op } from 'sequelize';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/users
router.get('/', authorize(ROLES.ADMINISTRATOR, ROLES.MANAGEMENT), async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    if (req.query.role) where.role = req.query.role;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/me
router.patch('/me',
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  validate,
  async (req, res, next) => {
    try {
      const currentUser = await User.findByPk(req.user.id);
      if (!currentUser) return error(res, 'User not found', 404);

      const before = {
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
      };
      const profile = await UserService.update(req.user.id, {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone || null,
      });

      await logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: currentUser.id,
        beforeData: before,
        afterData: { name: profile.name, email: profile.email, phone: profile.phone },
        ip: req.ip,
      });

      return success(res, profile, 'Profile updated');
    } catch (err) { next(err); }
  }
);

// GET /api/v1/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return error(res, 'User not found', 404);
    return success(res, user);
  } catch (err) { next(err); }
});

// POST /api/v1/users
router.post('/', authorize(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return error(res, 'Email already in use', 409);

    const hashed = await AuthService.hashPassword(password);
    const user = await User.create({ name, email, password: hashed, role, phone });

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'USER_CREATED', entityType: 'User', entityId: user.id,
      afterData: { name, email, role }, ip: req.ip,
    });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return success(res, userWithoutPassword, 'User created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/:id
router.patch('/:id', authorize(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found', 404);

    const { name, phone, role, is_active } = req.body;
    const before = { name: user.name, phone: user.phone, role: user.role, is_active: user.is_active };
    await user.update({ name, phone, role, is_active });

    await logAudit({
      actorId: req.user.id, actorName: req.user.name,
      action: 'USER_UPDATED', entityType: 'User', entityId: user.id,
      beforeData: before, afterData: { name, phone, role, is_active }, ip: req.ip,
    });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return success(res, userWithoutPassword);
  } catch (err) { next(err); }
});

// DELETE /api/v1/users/:id (soft delete = deactivate)
router.delete('/:id', authorize(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    if (user.id === req.user.id) return error(res, 'Cannot deactivate yourself', 400);
    await user.update({ is_active: false });
    return success(res, null, 'User deactivated');
  } catch (err) { next(err); }
});

export default router;
