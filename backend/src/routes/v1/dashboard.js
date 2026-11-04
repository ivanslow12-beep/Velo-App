import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { IWO, BAST, ACC, Customer, Service, User } from '../../models/index.js';
import { Op } from 'sequelize';

const router = Router();
router.use(authenticate);

// GET /api/v1/dashboard
router.get('/', async (req, res, next) => {
  try {
    const whereScope = {};
    if (req.user.role === 'SALES') {
      whereScope.sales_id = req.user.id;
    } else if (req.user.role === 'ENGINEER') {
      whereScope.engineer_id = req.user.id;
    }

    // KPI Counts
    const totalIwo = await IWO.count({ where: whereScope });
    const pendingIwo = await IWO.count({ where: { ...whereScope, status: ['DRAFT', 'PENDING'] } });
    const inProgressIwo = await IWO.count({ where: { ...whereScope, status: ['IN_PROGRESS', 'ACTIVATION', 'BAST', 'ACC'] } });
    const completedIwo = await IWO.count({ where: { ...whereScope, status: 'COMPLETED' } });
    const overdueIwo = await IWO.count({ where: { ...whereScope, is_overdue: true, status: { [Op.ne]: 'COMPLETED' } } });

    // SLA performance (% completed on time)
    const slaMet = await IWO.count({
      where: {
        ...whereScope,
        status: 'COMPLETED',
        is_overdue: false,
      },
    });
    const slaRate = completedIwo > 0 ? Math.round((slaMet / completedIwo) * 100) : 100;

    // Status breakdown (Donut chart data)
    const allStatuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'ACTIVATION', 'BAST', 'ACC', 'COMPLETED', 'CANCELLED'];
    const statusCounts = {};
    for (const st of allStatuses) {
      statusCounts[st] = await IWO.count({ where: { ...whereScope, status: st } });
    }

    // Monthly Trend (last 6 months)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endD = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = d.toLocaleString('id-ID', { month: 'short' });
      const count = await IWO.count({
        where: {
          ...whereScope,
          created_at: { [Op.between]: [d, endD] },
        },
      });
      monthlyTrend.push({ month: monthName, count });
    }

    // Action Required: Pending IWOs
    const pendingList = await IWO.findAll({
      where: { ...whereScope, status: ['DRAFT', 'PENDING'] },
      include: [
        { model: Customer, as: 'customer', attributes: ['name', 'code'] },
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'sales', attributes: ['name'] },
      ],
      limit: 5,
      order: [['created_at', 'ASC']],
    });

    // Action Required: Overdue IWOs
    const overdueList = await IWO.findAll({
      where: { ...whereScope, is_overdue: true, status: { [Op.ne]: 'COMPLETED' } },
      include: [
        { model: Customer, as: 'customer', attributes: ['name', 'code'] },
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'engineer', attributes: ['name'] },
      ],
      limit: 5,
      order: [['deadline_rfs', 'ASC']],
    });

    // Action Required: BAST waiting approval
    const bastPending = await BAST.count({ where: { status: 'PENDING_APPROVAL' } });

    // Action Required: ACC waiting customer approval
    const accPending = await ACC.count({ where: { status: 'SENT' } });

    return success(res, {
      kpi: {
        total: totalIwo,
        pending: pendingIwo,
        in_progress: inProgressIwo,
        completed: completedIwo,
        overdue: overdueIwo,
        sla_rate: `${slaRate}%`,
      },
      status_distribution: statusCounts,
      monthly_trend: monthlyTrend,
      action_required: {
        pending_iwo_count: pendingIwo,
        overdue_iwo_count: overdueIwo,
        bast_pending_approval: bastPending,
        acc_waiting_customer: accPending,
        pending_list: pendingList,
        overdue_list: overdueList,
      },
    });
  } catch (err) { next(err); }
});

export default router;
