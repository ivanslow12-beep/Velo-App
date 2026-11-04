import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { Service } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/v1/services
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.search) {
      where.name = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows } = await Service.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// GET /api/v1/services/:id
router.get('/:id', async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return error(res, 'Service not found', 404);
    return success(res, service);
  } catch (err) { next(err); }
});

// POST /api/v1/services
router.post('/', async (req, res, next) => {
  try {
    const { name, price, description } = req.body;
    const service = await Service.create({ name, price, description });
    return success(res, service, 'Service created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/services/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return error(res, 'Service not found', 404);
    await service.update(req.body);
    return success(res, service);
  } catch (err) { next(err); }
});

export default router;
