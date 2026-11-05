import { Op } from 'sequelize';
import { IWO, Customer, Service, User, IwoMilestone } from '../models/index.js';
import { generateIwoNumber } from '../utils/iwoNumbering.js';
import { getPagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { logAudit } from '../utils/auditLogger.js';
import { getMilestoneWeight, synchronizeIwoStatus } from '../utils/milestoneProgress.js';

const DEFAULT_MILESTONES = [
  'Survey',
  'Surat Izin',
  'Pembayaran Deposit',
  'Supervisi',
  'Request Barang',
  'Request IP',
  'Request Perangkat',
  'Penarikan Kabel BB',
  'Pelurusan VLAN',
  'Aktivasi Internet',
];

function normalizeServicePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw { status: 400, message: 'Tarif layanan harus berupa angka non-negatif dengan maksimal 2 angka desimal.' };
  }
  const price = Number(text);
  if (!Number.isFinite(price) || price > 9999999999999.99) {
    throw { status: 400, message: 'Tarif layanan berada di luar batas yang diizinkan.' };
  }
  return price;
}

export class IwoService {
  /**
   * List IWOs with optional filters and pagination.
   */
  static async list(filters = {}, paginationQuery = {}) {
    const { page, limit, offset } = getPagination(paginationQuery);
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.customerId) where.customer_id = filters.customerId;
    if (filters.salesId) where.sales_id = filters.salesId;
    if (filters.engineerId) where.engineer_id = filters.engineerId;
    if (filters.isOverdue === true || filters.isOverdue === 'true') where.is_overdue = true;

    if (filters.archived === 'true') {
      where.is_archived = true;
    } else if (filters.archived === 'false' || filters.archived === undefined) {
      where.is_archived = false;
    }

    if (filters.search) {
      where[Op.or] = [
        { iwo_no: { [Op.like]: `%${filters.search}%` } },
        { customer_name_manual: { [Op.like]: `%${filters.search}%` } },
        { service_name_manual: { [Op.like]: `%${filters.search}%` } },
        { pic_project: { [Op.like]: `%${filters.search}%` } },
        { partner_1: { [Op.like]: `%${filters.search}%` } },
        { partner_2: { [Op.like]: `%${filters.search}%` } },
        { sales_name_manual: { [Op.like]: `%${filters.search}%` } },
        { notes: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await IWO.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'code', 'phone', 'email', 'contact_name', 'address'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'price'] },
        { model: User, as: 'sales', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'engineer', attributes: ['id', 'name', 'email'] },
      ],
    });

    return {
      rows,
      pagination: buildPaginationMeta(count, page, limit),
    };
  }

  /**
   * Get a single IWO by ID.
   */
  static async getById(id, include = true) {
    const MilestoneModel = IwoMilestone;
    const includeOpts = include
      ? [
          { model: Customer, as: 'customer' },
          { model: Service, as: 'service' },
          { model: User, as: 'sales', attributes: ['id', 'name', 'email', 'phone'] },
          { model: User, as: 'engineer', attributes: ['id', 'name', 'email', 'phone'] },
          { model: MilestoneModel, as: 'milestones', order: [['order', 'ASC']] },
        ]
      : [];

    const iwo = await IWO.findByPk(id, { include: includeOpts });
    if (!iwo) throw { status: 404, message: 'IWO not found' };
    return iwo;
  }

  /**
   * Create a new IWO with hybrid input support.
   */
  static async create(data, actorId) {
    const service_price = normalizeServicePrice(data.service_price);
    let iwo_no = (data.iwo_no || '').trim();
    if (iwo_no) {
      // Validate uniqueness if manual iwo_no is provided
      const existing = await IWO.findOne({ where: { iwo_no } });
      if (existing) {
        throw { status: 400, message: `Nomor IWO "${iwo_no}" sudah digunakan. Silakan gunakan nomor lain.` };
      }
    } else {
      iwo_no = await generateIwoNumber(IWO);
    }

    // Resolve Customer (manual or master)
    let customer_id = data.customer_id || null;
    let customer_name_manual = (data.customer_name_manual || data.customer_name || data.customer || '').trim() || null;
    if (!customer_id && customer_name_manual) {
      const [cust] = await Customer.findOrCreate({
        where: { name: customer_name_manual },
        defaults: {
          code: `CUST-${Date.now().toString().slice(-4)}`,
          name: customer_name_manual,
          address: data.customer_address_manual || null,
          contact_name: data.customer_contact_person || null,
          email: data.customer_email || null,
          phone: data.customer_phone || null,
        },
      });
      customer_id = cust.id;
    } else if (customer_id && !customer_name_manual) {
      const cust = await Customer.findByPk(customer_id);
      if (cust) customer_name_manual = cust.name;
    }

    // Resolve Service (manual or master)
    let service_id = data.service_id || null;
    let service_name_manual = (data.service_name_manual || data.service_name || data.service || '').trim() || null;
    if (!service_id && service_name_manual) {
      const [svc] = await Service.findOrCreate({
        where: { name: service_name_manual },
        defaults: {
          name: service_name_manual,
          price: 0,
          description: 'Layanan / Paket Input Manual',
        },
      });
      service_id = svc.id;
    } else if (service_id && !service_name_manual) {
      const svc = await Service.findByPk(service_id);
      if (svc) service_name_manual = svc.name;
    }

    // Resolve Sales (manual or user ID)
    const sales_id = data.sales_id || actorId;
    let sales_name_manual = (data.sales_name_manual || data.sales_name || data.sales || '').trim() || null;
    if (!sales_name_manual && sales_id) {
      const sUser = await User.findByPk(sales_id);
      if (sUser) sales_name_manual = sUser.name;
    }

    const iwo = await IWO.create({
      iwo_no,
      request_date: data.request_date || new Date(),
      request_type: data.request_type || 'NEW_INSTALLATION',
      customer_id,
      customer_name_manual,
      customer_contact_person: data.customer_contact_person || null,
      customer_phone: data.customer_phone || null,
      customer_email: data.customer_email || null,
      customer_address_manual: data.customer_address_manual || null,
      service_id,
      service_name_manual,
      service_price,
      sales_id,
      sales_name_manual,
      industry_sales: data.industry_sales || null,
      engineer_id: data.engineer_id || null,
      pic_project: data.pic_project || null,
      partner_1: data.partner_1 || null,
      partner_2: data.partner_2 || null,
      pop_or_standalone: data.pop_or_standalone || null,
      priority: data.priority || 'NORMAL',
      status: 'PENDING',
      progress: 0,
      deadline_rfs: data.deadline_rfs || null,
      notes: data.notes || null,
      sla_days: data.sla_days || 14,
      is_overdue: false,
      is_archived: false,
      created_by: actorId,
    });

    // Seed default milestones
    const MilestoneModel = IwoMilestone;
    const milestoneData = DEFAULT_MILESTONES.map((name, index) => ({
      iwo_id: iwo.id,
      name,
      weight: getMilestoneWeight(name),
      order: index + 1,
      status: 'PENDING',
    }));
    await MilestoneModel.bulkCreate(milestoneData);

    await IWO.update(
      { status: 'PENDING', progress: 0, status_locked: false },
      { where: { id: iwo.id } },
    );

    await logAudit({
      actorId,
      action: 'IWO_CREATED',
      entityType: 'IWO',
      entityId: iwo.id,
      afterData: iwo.toJSON(),
    });

    return IwoService.getById(iwo.id);
  }

  /**
   * Update IWO fields.
   */
  static async update(id, data, actorId) {
    const iwo = await IWO.findByPk(id);
    if (!iwo) throw { status: 404, message: 'IWO not found' };

    const before = iwo.toJSON();
    if (data.service_price !== undefined) {
      data.service_price = normalizeServicePrice(data.service_price);
    }

    // Check iwo_no uniqueness if changed
    if (data.iwo_no && data.iwo_no.trim() !== iwo.iwo_no) {
      const existing = await IWO.findOne({ where: { iwo_no: data.iwo_no.trim() } });
      if (existing && existing.id !== iwo.id) {
        throw { status: 400, message: `Nomor IWO "${data.iwo_no}" sudah digunakan oleh IWO lain.` };
      }
    }

    const allowedFields = [
      'iwo_no',
      'request_type', 'request_date', 'deadline_rfs', 'priority', 'status', 'progress', 'notes', 'sla_days',
      'customer_id', 'customer_name_manual', 'customer_contact_person', 'customer_phone', 'customer_email', 'customer_address_manual',
      'service_id', 'service_name_manual', 'service_price',
      'sales_id', 'sales_name_manual', 'industry_sales',
      'engineer_id', 'pic_project', 'partner_1', 'partner_2', 'pop_or_standalone',
      'is_archived',
    ];

    const updateData = { updated_by: actorId };
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    if (data.customer_name !== undefined && updateData.customer_name_manual === undefined) {
      updateData.customer_name_manual = data.customer_name;
    }
    if (data.service_name !== undefined && updateData.service_name_manual === undefined) {
      updateData.service_name_manual = data.service_name;
    }
    if (data.sales_name !== undefined && updateData.sales_name_manual === undefined) {
      updateData.sales_name_manual = data.sales_name;
    }

    // Auto-sync customer name if customer_id changes and no manual override
    if (updateData.customer_id && !updateData.customer_name_manual) {
      const cust = await Customer.findByPk(updateData.customer_id);
      if (cust) updateData.customer_name_manual = cust.name;
    }

    // Auto-sync service name if service_id changes
    if (updateData.service_id && !updateData.service_name_manual) {
      const svc = await Service.findByPk(updateData.service_id);
      if (svc) updateData.service_name_manual = svc.name;
    }

    await iwo.update(updateData);

    await logAudit({
      actorId,
      action: 'IWO_UPDATED',
      entityType: 'IWO',
      entityId: iwo.id,
      beforeData: before,
      afterData: iwo.toJSON(),
    });

    return IwoService.getById(iwo.id);
  }

  /**
   * Archive or Unarchive an IWO.
   */
  static async toggleArchive(id, archiveState, actorId) {
    const iwo = await IWO.findByPk(id);
    if (!iwo) throw { status: 404, message: 'IWO not found' };

    const shouldArchive = typeof archiveState === 'boolean' ? archiveState : !iwo.is_archived;
    const beforeState = iwo.is_archived;

    await iwo.update({
      is_archived: shouldArchive,
      status_locked: false,
      status: shouldArchive ? 'ARCHIVED' : synchronizeIwoStatus(iwo.status, Number(iwo.progress)),
      updated_by: actorId,
    });

    await logAudit({
      actorId,
      action: shouldArchive ? 'IWO_ARCHIVED' : 'IWO_UNARCHIVED',
      entityType: 'IWO',
      entityId: iwo.id,
      beforeData: { is_archived: beforeState },
      afterData: { is_archived: shouldArchive },
    });

    return iwo;
  }

  /**
   * Delete an IWO and its associated records.
   */
  static async delete(id, actorId) {
    const iwo = await IWO.findByPk(id);
    if (!iwo) throw { status: 404, message: 'IWO not found' };

    const beforeData = iwo.toJSON();

    const MilestoneModel = IwoMilestone;
    // Remove related records to avoid FK lock
    await MilestoneModel.destroy({ where: { iwo_id: id } });

    await iwo.destroy();

    await logAudit({
      actorId,
      action: 'IWO_DELETED',
      entityType: 'IWO',
      entityId: id,
      beforeData,
    });

    return { success: true, message: `IWO ${beforeData.iwo_no || id} berhasil dihapus.` };
  }

  /**
   * Return dashboard statistics.
   */
  static async getStats() {
    const [total, draft, inProgress, completed, cancelled, onHold, overdue, archived] = await Promise.all([
      IWO.count({ where: { is_archived: false } }),
      IWO.count({ where: { status: 'DRAFT', is_archived: false } }),
      IWO.count({ where: { status: 'IN_PROGRESS', is_archived: false } }),
      IWO.count({ where: { status: 'COMPLETED', is_archived: false } }),
      IWO.count({ where: { status: 'CANCELLED', is_archived: false } }),
      IWO.count({ where: { status: 'PENDING', is_archived: false } }),
      IWO.count({ where: { is_overdue: true, is_archived: false } }),
      IWO.count({ where: { is_archived: true } }),
    ]);

    return {
      total,
      byStatus: { draft, inProgress, completed, cancelled, pending: onHold },
      overdue,
      archived,
    };
  }
}
