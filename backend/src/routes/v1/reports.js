import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { IWO, Customer, Service, User } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/v1/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const total = await IWO.count();
    const completed = await IWO.count({ where: { status: 'COMPLETED' } });
    const overdue = await IWO.count({ where: { is_overdue: true } });

    const byType = {};
    const types = ['NEW_INSTALLATION', 'RELOCATION', 'UPGRADE', 'DOWNGRADE', 'TERMINATION', 'MAINTENANCE'];
    for (const t of types) {
      byType[t] = await IWO.count({ where: { request_type: t } });
    }

    const byPriority = {};
    for (const p of ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']) {
      byPriority[p] = await IWO.count({ where: { priority: p } });
    }

    return success(res, {
      total,
      completed,
      overdue,
      by_request_type: byType,
      by_priority: byPriority,
    });
  } catch (err) { next(err); }
});

export default router;
