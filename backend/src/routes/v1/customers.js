import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success, error, paginated } from '../../utils/response.js';
import { getPagination, buildPaginationMeta } from '../../utils/paginationHelper.js';
import { Customer } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/v1/customers
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { code: { [Op.like]: `%${req.query.search}%` } },
        { contact_name: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    return paginated(res, rows, buildPaginationMeta(count, page, limit));
  } catch (err) { next(err); }
});

// GET /api/v1/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return error(res, 'Customer not found', 404);
    return success(res, customer);
  } catch (err) { next(err); }
});

// POST /api/v1/customers
router.post('/', async (req, res, next) => {
  try {
    const { code, name, address, contact_name, email, phone } = req.body;
    const existing = await Customer.findOne({ where: { code } });
    if (existing) return error(res, 'Customer code already exists', 409);

    const customer = await Customer.create({ code, name, address, contact_name, email, phone });
    return success(res, customer, 'Customer created', 201);
  } catch (err) { next(err); }
});

// PATCH /api/v1/customers/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return error(res, 'Customer not found', 404);
    await customer.update(req.body);
    return success(res, customer);
  } catch (err) { next(err); }
});

export default router;
